// ─── Vector Store (in-memory + IndexedDB) ────────────────────────────────────
//
// MVP semantic index: vectors live in IndexedDB (the `embeddings` store) and are
// mirrored into an in-memory Map for brute-force cosine search. For the typical
// QDA project (hundreds–few thousand items) a linear scan of 768-dim vectors is
// a few milliseconds — no ANN index / native crate needed. If a project grows
// past ~50k items we can swap in an HNSW backend behind this same API.
//
// Holds two kinds of records: "segment" (coded/noted passages) and "chunk"
// (slices of raw document text) so search spans whole files, not just segments.

import { dbGetAll, dbPutAll, dbDeleteMany, dbDeleteAll, type EmbeddingRecord } from "@/lib/db";
import { cosineSimilarity } from "@/lib/embeddings";

export type EmbeddingKind = "segment" | "chunk";

interface VecEntry {
  vector: Float32Array;
  kind: EmbeddingKind;
  projectId: string;
  documentId: string;
  text: string;
  charStart?: number;
  charEnd?: number;
  model: string;
}

const store = new Map<string, VecEntry>();
let loaded = false;

/** Load all persisted vectors into memory. Returns the count loaded. */
export async function loadVectors(): Promise<number> {
  const rows = await dbGetAll<EmbeddingRecord>("embeddings");
  store.clear();
  for (const r of rows) {
    // Skip legacy/incompatible records (pre-chunk schema had no kind/documentId);
    // they'll simply be re-indexed.
    if (!r.kind || !r.documentId || typeof r.text !== "string") continue;
    store.set(r.id, {
      vector: Float32Array.from(r.vector),
      kind: r.kind,
      projectId: r.projectId,
      documentId: r.documentId,
      text: r.text,
      charStart: r.charStart,
      charEnd: r.charEnd,
      model: r.model,
    });
  }
  loaded = true;
  return store.size;
}

export function isLoaded(): boolean {
  return loaded;
}

export function hasVector(id: string, model?: string): boolean {
  const e = store.get(id);
  if (!e) return false;
  // When a model is given, a vector only "counts" if it was built with that
  // model — so switching models (even same dimensionality, e.g. mxbai↔bge-m3)
  // marks the old vectors as needing re-index instead of silently mismatching.
  return model ? e.model === model : true;
}

export function getVector(id: string): Float32Array | undefined {
  return store.get(id)?.vector;
}

/** Count vectors held, optionally scoped to a project and/or kind. */
export function vectorCount(projectId?: string, kind?: EmbeddingKind): number {
  if (!projectId && !kind) return store.size;
  let n = 0;
  for (const v of store.values()) {
    if (projectId && v.projectId !== projectId) continue;
    if (kind && v.kind !== kind) continue;
    n++;
  }
  return n;
}

export interface UpsertItem {
  id: string;
  kind: EmbeddingKind;
  projectId: string;
  documentId: string;
  text: string;
  charStart?: number;
  charEnd?: number;
  vector: number[];
  model: string;
}

/** Persist + cache a batch of vectors. */
export async function upsertVectors(items: UpsertItem[]): Promise<void> {
  if (items.length === 0) return;
  const now = Date.now();
  const rows: EmbeddingRecord[] = items.map((it) => ({
    id: it.id,
    kind: it.kind,
    projectId: it.projectId,
    documentId: it.documentId,
    text: it.text,
    charStart: it.charStart,
    charEnd: it.charEnd,
    vector: it.vector,
    model: it.model,
    dim: it.vector.length,
    updatedAt: now,
  }));
  await dbPutAll("embeddings", rows);
  for (const it of items) {
    store.set(it.id, {
      vector: Float32Array.from(it.vector),
      kind: it.kind,
      projectId: it.projectId,
      documentId: it.documentId,
      text: it.text,
      charStart: it.charStart,
      charEnd: it.charEnd,
      model: it.model,
    });
  }
}

/** Remove vectors by id (cache + persisted, single DB transaction). */
export async function removeVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  for (const id of ids) store.delete(id);
  await dbDeleteMany("embeddings", ids);
}

/** Wipe ALL embeddings (cache + persisted) in one fast op — used when clearing a
 *  project that owns every vector. */
export async function clearAll(): Promise<void> {
  store.clear();
  await dbDeleteAll("embeddings");
}

/** All cached ids, optionally scoped to a project. */
export function allIds(projectId?: string): string[] {
  const out: string[] = [];
  for (const [id, v] of store) {
    if (projectId && v.projectId !== projectId) continue;
    out.push(id);
  }
  return out;
}

export interface VectorHit {
  id: string;
  score: number;
  kind: EmbeddingKind;
  documentId: string;
  text: string;
  charStart?: number;
  charEnd?: number;
}

export interface SearchOpts {
  topK: number;
  projectId?: string;
  /** Only consider ids in this set (drops stale/orphaned vectors). */
  validIds?: Set<string>;
  /** Exclude this id from results (used by "find similar"). */
  excludeId?: string;
  /** Exclude all items from this document (cross-document "find similar"). */
  excludeDocumentId?: string;
  /** Only compare against vectors built with this model (avoids comparing across
   *  different embedding spaces of the same dimensionality). */
  model?: string;
}

/** Brute-force top-K cosine search over the in-memory vectors. */
export function searchVectors(query: ArrayLike<number>, opts: SearchOpts): VectorHit[] {
  const hits: VectorHit[] = [];
  const qLen = query.length;
  for (const [id, entry] of store) {
    if (opts.projectId && entry.projectId !== opts.projectId) continue;
    // Different embedding model/provider ⇒ different dimensionality. Skip so a
    // provider switch doesn't compare incompatible vectors (garbage scores)
    // until the user re-indexes.
    if (entry.vector.length !== qLen) continue;
    if (opts.model && entry.model !== opts.model) continue;
    if (opts.validIds && !opts.validIds.has(id)) continue;
    if (opts.excludeId && id === opts.excludeId) continue;
    if (opts.excludeDocumentId && entry.documentId === opts.excludeDocumentId) continue;
    hits.push({
      id,
      score: cosineSimilarity(query, entry.vector),
      kind: entry.kind,
      documentId: entry.documentId,
      text: entry.text,
      charStart: entry.charStart,
      charEnd: entry.charEnd,
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, opts.topK);
}

/** Wipe the in-memory cache (does not touch IndexedDB). */
export function clearMemory(): void {
  store.clear();
  loaded = false;
}
