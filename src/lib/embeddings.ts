// ─── Embeddings ──────────────────────────────────────────────────────────────
//
// Local, on-device text embeddings via the Ollama server (through the Tauri
// `local_http` command, same loopback-only path the LLM providers use). Default
// model is `nomic-embed-text` (768 dims). No data leaves the machine.

import { invoke } from "@tauri-apps/api/core";
import { nativeHttp } from "@/lib/nativeHttp";

export const DEFAULT_EMBED_MODEL = "nomic-embed-text";

export type EmbedProviderType = "ollama" | "openai" | "gemini";

export interface EmbedOptions {
  provider: EmbedProviderType;
  /** Embedding model: "nomic-embed-text" (ollama), "text-embedding-3-small"
   *  (openai), "text-embedding-004" (gemini), etc. */
  model: string;
  baseUrl?: string;   // Ollama base URL
  apiKey?: string;    // OpenAI / Gemini key
}

/**
 * Embed a batch of texts. Routes to local Ollama (on-device, default), the
 * OpenAI embeddings API, or the Gemini embeddings API (cloud — use the user's
 * key). Returns one vector per input text, in order. Throws on transport/HTTP
 * errors. (Anthropic offers no embeddings endpoint, so it isn't a choice.)
 */
export async function embedTexts(texts: string[], opts: EmbedOptions): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (opts.provider === "openai") return embedOpenAI(texts, opts);
  if (opts.provider === "gemini") return embedGemini(texts, opts);
  return embedOllama(texts, opts);
}

async function embedOllama(texts: string[], opts: EmbedOptions): Promise<number[][]> {
  const url = `${(opts.baseUrl ?? "http://127.0.0.1:11434").replace(/\/$/, "")}/api/embed`;
  const [status, body] = await invoke<[number, string]>("local_http", {
    method: "POST",
    url,
    headersJson: JSON.stringify({ "Content-Type": "application/json" }),
    body: JSON.stringify({ model: opts.model, input: texts }),
  });
  if (status < 200 || status >= 300) {
    throw new Error(`Ollama embedding failed (HTTP ${status})`);
  }
  const data = JSON.parse(body) as { embeddings?: number[][] };
  if (!data.embeddings || !Array.isArray(data.embeddings)) {
    throw new Error("Ollama embedding response missing 'embeddings'");
  }
  return data.embeddings;
}

async function embedOpenAI(texts: string[], opts: EmbedOptions): Promise<number[][]> {
  if (!opts.apiKey) {
    throw new Error("OpenAI embedding için API anahtarı gerekli (Ayarlar > API Anahtarları).");
  }
  const res = await nativeHttp("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({ model: opts.model, input: texts }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`OpenAI embedding failed (HTTP ${res.status})`);
  }
  const data = JSON.parse(res.body) as { data?: { embedding: number[]; index: number }[] };
  if (!data.data) throw new Error("OpenAI embedding response malformed");
  return data.data.slice().sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedGemini(texts: string[], opts: EmbedOptions): Promise<number[][]> {
  if (!opts.apiKey) {
    throw new Error("Gemini embedding için API anahtarı gerekli (Ayarlar > API Anahtarları).");
  }
  const model = opts.model.startsWith("models/") ? opts.model : `models/${opts.model}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents?key=${opts.apiKey}`;
  const res = await nativeHttp(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((t) => ({ model, content: { parts: [{ text: t }] } })),
    }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Gemini embedding failed (HTTP ${res.status})`);
  }
  const data = JSON.parse(res.body) as { embeddings?: { values: number[] }[] };
  if (!data.embeddings) throw new Error("Gemini embedding response malformed");
  return data.embeddings.map((e) => e.values);
}

/** Embed a single text and return its vector. */
export async function embedOne(text: string, opts: EmbedOptions): Promise<number[]> {
  const [vec] = await embedTexts([text], opts);
  return vec ?? [];
}

export interface TextChunk {
  text: string;
  charStart: number;
  charEnd: number;
}

/**
 * Split document text into ~`size`-char chunks on whitespace boundaries (so
 * words aren't cut), with a small overlap so meaning that straddles a boundary
 * is still searchable. Offsets are into the original string.
 */
export function chunkText(content: string, size = 420, overlap = 70): TextChunk[] {
  const text = content ?? "";
  if (text.trim().length === 0) return [];
  if (text.length <= size) return [{ text, charStart: 0, charEnd: text.length }];

  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      // Back up to the last whitespace so we don't cut a word in half.
      const ws = text.lastIndexOf(" ", end);
      if (ws > start + size * 0.5) end = ws;
    }
    const slice = text.slice(start, end);
    if (slice.trim().length > 0) {
      chunks.push({ text: slice.trim(), charStart: start, charEnd: end });
    }
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

/** Cosine similarity between two equal-length numeric vectors (0..1 for >=0 inputs). */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
