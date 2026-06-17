// ─── Embeddings Store ────────────────────────────────────────────────────────
//
// Orchestrates local semantic indexing/search on top of `vectorStore` (storage)
// and `embeddings` (the embedding provider). All config (provider, model, chunk
// size, whether to index raw document content) is user-controlled via Settings.
// Default is segments-only + on-device Ollama — light and fully offline.

import { create } from "zustand";
import { useSettingsStore } from "@/store/settings.store";
import { useProjectStore } from "@/store/project.store";
import { embedTexts, chunkText, type EmbedOptions } from "@/lib/embeddings";
import { extractPdfText } from "@/lib/pdfText";
import * as vec from "@/lib/vectorStore";
import type { Document } from "@/types";

const BATCH_SIZE = 24;
const MIN_TEXT_LEN = 3;
// Relevance gate. Within one homogeneous document everything scores moderately
// high, so a flat floor lets noise through. We combine an absolute floor with an
// ADAPTIVE one relative to the best hit: keep only results close to the top
// match, which surfaces genuinely-similar passages and drops the moderate tail.
// Show the top-K most-similar results above a low floor (which only drops
// clearly-unrelated matches). The % score is shown in the UI so the user judges
// relevance — an aggressive/adaptive threshold caused "no results" on diluted
// cross-document chunks.
const MIN_SCORE = 0.4;
// "Find similar" embeds the selected passage, which matches its own source
// segment/chunk at ~1.0 — drop those near-identical hits so results are OTHER
// passages, not the text the user just selected.
const NEAR_DUP = 0.95;

type IndexStatus = "idle" | "loading" | "indexing" | "ready" | "error";

export interface SemanticResultItem {
  id: string;
  score: number;
  kind: vec.EmbeddingKind;
  documentId: string;
  text: string;
  charStart?: number;
  charEnd?: number;
  /** Present when kind === "segment" (for data-segment-id navigation). */
  segmentId?: string;
}

interface IndexItem {
  id: string;
  kind: vec.EmbeddingKind;
  documentId: string;
  text: string;
  charStart?: number;
  charEnd?: number;
}

interface EmbeddingsState {
  status: IndexStatus;
  total: number;     // indexable items (segments [+ document chunks if enabled])
  indexed: number;   // how many have a vector
  progress: number;  // 0..100 while indexing
  lastError: string | null;

  init: () => Promise<void>;
  refreshCounts: (projectId: string) => void;
  indexProject: (projectId: string) => Promise<void>;
  search: (query: string, projectId: string, topK?: number, excludeDocumentId?: string) => Promise<SemanticResultItem[]>;
  findSimilar: (segmentId: string, projectId: string, topK?: number, excludeDocumentId?: string) => Promise<SemanticResultItem[]>;
  clear: (projectId: string) => Promise<void>;
}

/** Build embed options from the user's Settings. */
function embedOpts(): EmbedOptions {
  const s = useSettingsStore.getState();
  const apiKey = s.embedProvider === "gemini" ? s.getGeminiKey() : s.getOpenAIKey();
  return {
    provider: s.embedProvider,
    model: s.embedModel,
    baseUrl: s.ollamaBaseUrl,
    apiKey,
  };
}

/** Every item we want indexed for a project: segments, plus document chunks
 *  when the user has enabled document-content indexing. */
function allItems(projectId: string): IndexItem[] {
  const { segments, documents } = useProjectStore.getState();
  const { embedIndexDocuments, embedChunkSize } = useSettingsStore.getState();
  const out: IndexItem[] = [];

  for (const s of segments) {
    if (s.projectId !== projectId) continue;
    if ((s.text?.trim().length ?? 0) < MIN_TEXT_LEN) continue;
    out.push({ id: s.id, kind: "segment", documentId: s.documentId, text: s.text, charStart: s.start, charEnd: s.end });
  }

  if (embedIndexDocuments) {
    for (const d of documents) {
      if (d.projectId !== projectId) continue;
      const text = documentSearchText(d);
      if (!text || text.trim().length < MIN_TEXT_LEN) continue;
      chunkText(text, embedChunkSize).forEach((c, i) => {
        out.push({ id: `chunk:${d.id}:${i}`, kind: "chunk", documentId: d.id, text: c.text, charStart: c.charStart, charEnd: c.charEnd });
      });
    }
  }
  return out;
}

/** A document's SEARCHABLE text. Text/HTML docs store it in `content`; PDFs store
 *  base64 binary in `content`, so their extracted text lives in `extractedText`.
 *  Returns null when there's nothing indexable (e.g. an un-extracted PDF). */
function documentSearchText(d: Document): string | null {
  const fmt = d.format ?? "text";
  if (fmt === "text" || fmt === "html") return d.content;
  if (fmt === "pdf") return d.extractedText ?? null;
  return null; // video / image — no text
}

/** PDFs whose text hasn't been extracted yet — they aren't in allItems() but
 *  WILL be indexed (extraction happens on "İndeksle"), so the UI must count
 *  them as pending work (otherwise total=0 and no index button appears). */
function pendingPdfCount(projectId: string): number {
  if (!useSettingsStore.getState().embedIndexDocuments) return 0;
  return useProjectStore.getState().documents.filter(
    (d) =>
      d.projectId === projectId &&
      (d.format ?? "") === "pdf" &&
      d.extractedText === undefined &&
      typeof d.content === "string" &&
      d.content.length > 0
  ).length;
}

/** Cheap hit validator — drops results whose underlying segment/document was
 *  deleted, WITHOUT re-chunking every document on every search. */
function makeValidator(projectId: string): (h: vec.VectorHit) => boolean {
  const { segments, documents } = useProjectStore.getState();
  const segIds = new Set(segments.filter((s) => s.projectId === projectId).map((s) => s.id));
  const docIds = new Set(documents.filter((d) => d.projectId === projectId).map((d) => d.id));
  return (h) => (h.kind === "segment" ? segIds.has(h.id) : docIds.has(h.documentId));
}

function toResultItem(h: vec.VectorHit): SemanticResultItem {
  return {
    id: h.id,
    score: h.score,
    kind: h.kind,
    documentId: h.documentId,
    text: h.text,
    charStart: h.charStart,
    charEnd: h.charEnd,
    segmentId: h.kind === "segment" ? h.id : undefined,
  };
}

export const useEmbeddingsStore = create<EmbeddingsState>((set, get) => ({
  status: "idle",
  total: 0,
  indexed: 0,
  progress: 0,
  lastError: null,

  init: async () => {
    set({ status: "loading", lastError: null });
    try {
      await vec.loadVectors();
      set({ status: "ready" });
    } catch (e) {
      set({ status: "error", lastError: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshCounts: (projectId) => {
    const model = useSettingsStore.getState().embedModel;
    const items = allItems(projectId);
    const indexed = items.filter((i) => vec.hasVector(i.id, model)).length;
    // Include un-extracted PDFs so the index button/prompt appears for a fresh
    // PDF-only project (their chunks materialize after extraction).
    set({ total: items.length + pendingPdfCount(projectId), indexed });
  },

  indexProject: async (projectId) => {
    const model = useSettingsStore.getState().embedModel;

    // Step 0: extract text from PDFs that don't have it yet. A PDF's `content`
    // is base64 binary — without this we'd embed garbage (the real bug behind
    // "irrelevant results"). Extracted text is cached on the document.
    if (useSettingsStore.getState().embedIndexDocuments) {
      const pdfs = useProjectStore.getState().documents.filter(
        (d) =>
          d.projectId === projectId &&
          (d.format ?? "") === "pdf" &&
          d.extractedText === undefined &&
          typeof d.content === "string" &&
          d.content.length > 0
      );
      if (pdfs.length > 0) {
        set({ status: "indexing", progress: 0, lastError: null });
        const updateDocument = useProjectStore.getState().updateDocument;
        for (const d of pdfs) {
          try {
            const text = await extractPdfText(d.content);
            updateDocument(d.id, { extractedText: text });
          } catch (e) {
            console.error("[Embeddings] PDF text extraction failed:", d.name, e);
            updateDocument(d.id, { extractedText: "" }); // mark attempted; don't retry
          }
        }
      }
    }

    // Single chunk pass — do NOT re-run allItems() inside the batch loop.
    const items = allItems(projectId);
    const pending = items.filter((i) => !vec.hasVector(i.id, model));
    const baseIndexed = items.length - pending.length;
    set({ total: items.length, indexed: baseIndexed });
    if (pending.length === 0) {
      set({ status: "ready", progress: 100 });
      return;
    }

    set({ status: "indexing", progress: 0, lastError: null });
    try {
      const opts = embedOpts();
      let done = 0;
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        const vectors = await embedTexts(batch.map((b) => b.text), opts);
        await vec.upsertVectors(
          batch
            .map((b, j) => ({
              id: b.id,
              kind: b.kind,
              projectId,
              documentId: b.documentId,
              text: b.text,
              charStart: b.charStart,
              charEnd: b.charEnd,
              vector: vectors[j] ?? [],
              model,
            }))
            .filter((x) => x.vector.length > 0)
        );
        done += batch.length;
        set({ progress: Math.round((done / pending.length) * 100), indexed: baseIndexed + done });
      }
      set({ status: "ready", progress: 100, indexed: items.length });
    } catch (e) {
      set({ status: "error", lastError: e instanceof Error ? e.message : String(e) });
    }
  },

  search: async (query, projectId, topK = 12, excludeDocumentId) => {
    const model = useSettingsStore.getState().embedModel;
    const [qVec] = await embedTexts([query], embedOpts());
    if (!qVec) return [];
    const isValid = makeValidator(projectId);
    return vec
      .searchVectors(qVec, { topK: topK * 3, projectId, excludeDocumentId, model })
      .filter((h) => isValid(h) && h.score >= MIN_SCORE && h.score < NEAR_DUP)
      .slice(0, topK)
      .map(toResultItem);
  },

  findSimilar: async (segmentId, projectId, topK = 12, excludeDocumentId) => {
    // Always re-embed with the current model (a stored vector may be from an
    // older model and wouldn't compare correctly).
    const seg = useProjectStore.getState().segments.find((s) => s.id === segmentId);
    if (!seg?.text?.trim()) return [];
    const model = useSettingsStore.getState().embedModel;
    const [qVec] = await embedTexts([seg.text], embedOpts());
    if (!qVec) return [];
    const isValid = makeValidator(projectId);
    return vec
      .searchVectors(qVec, { topK: topK * 3, projectId, excludeId: segmentId, excludeDocumentId, model })
      .filter((h) => isValid(h) && h.score >= MIN_SCORE && h.score < NEAR_DUP)
      .slice(0, topK)
      .map(toResultItem);
  },

  clear: async (projectId) => {
    // Fast path: if every cached vector belongs to this project, wipe the whole
    // store in one op instead of deleting thousands of keys one by one.
    const all = vec.vectorCount();
    if (all > 0 && vec.vectorCount(projectId) === all) {
      await vec.clearAll();
    } else {
      await vec.removeVectors(vec.allIds(projectId));
    }
    get().refreshCounts(projectId);
  },
}));
