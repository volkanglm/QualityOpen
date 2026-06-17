import { describe, it, expect, beforeEach, vi } from "vitest";

// vectorStore persists to IndexedDB; stub the db layer so upsert/search work
// against the in-memory cache only (no IndexedDB in the test environment).
vi.mock("@/lib/db", () => ({
  dbGetAll: vi.fn(async () => []),
  dbPutAll: vi.fn(async () => {}),
  dbDeleteMany: vi.fn(async () => {}),
  dbDeleteAll: vi.fn(async () => {}),
}));

import { cosineSimilarity, chunkText } from "@/lib/embeddings";
import { upsertVectors, searchVectors, clearMemory, type UpsertItem } from "@/lib/vectorStore";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
  });

  it("returns 1 for parallel (scaled) vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 12);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 12);
  });

  it("returns 0 when either vector is all zeros (no NaN)", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it("compares only the overlapping prefix when lengths differ", () => {
    // first two components are identical → similarity over the shared prefix is 1
    expect(cosineSimilarity([1, 2, 999], [1, 2])).toBeCloseTo(1, 12);
  });

  it("matches a hand-computed value", () => {
    // a·b = 3·1 + 4·3 = 15, |a| = 5, |b| = sqrt(10) → 15 / (5·sqrt(10))
    const expected = 15 / (5 * Math.sqrt(10));
    expect(cosineSimilarity([3, 4], [1, 3])).toBeCloseTo(expected, 12);
  });

  it("is symmetric", () => {
    const a = [0.1, -0.5, 0.9, 0.3];
    const b = [0.7, 0.2, -0.4, 0.6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 12);
  });
});

describe("chunkText", () => {
  it("returns no chunks for empty or whitespace-only input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("returns a single chunk spanning the whole string when short", () => {
    const text = "a short sentence under the size limit";
    const chunks = chunkText(text, 420);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ text, charStart: 0, charEnd: text.length });
  });

  it("splits long text into multiple chunks", () => {
    const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
    const size = 200;
    const chunks = chunkText(text, size, 40);

    expect(chunks.length).toBeGreaterThan(1);
    // every chunk fits within the size budget
    for (const c of chunks) {
      expect(c.charEnd - c.charStart).toBeLessThanOrEqual(size);
      expect(c.text.length).toBeLessThanOrEqual(size);
      expect(c.charEnd).toBeGreaterThan(c.charStart);
    }
  });

  it("breaks on whitespace so words are not cut mid-token", () => {
    const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, 200, 40);
    // every non-final chunk ends exactly on a space boundary
    for (const c of chunks) {
      if (c.charEnd < text.length) {
        expect(text[c.charEnd]).toBe(" ");
      }
    }
  });

  it("produces overlapping, ascending, fully-covering chunks", () => {
    const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
    const overlap = 40;
    const chunks = chunkText(text, 200, overlap);

    // starts strictly ascending
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].charStart).toBeGreaterThan(chunks[i - 1].charStart);
      // consecutive chunks overlap (next starts before previous ends)
      expect(chunks[i].charStart).toBeLessThan(chunks[i - 1].charEnd);
    }
    // coverage reaches the end of the text
    expect(chunks[chunks.length - 1].charEnd).toBe(text.length);
  });
});

describe("searchVectors", () => {
  const item = (over: Partial<UpsertItem>): UpsertItem => ({
    id: "x",
    kind: "segment",
    projectId: "p1",
    documentId: "d1",
    text: "t",
    vector: [1, 0, 0],
    model: "nomic-embed-text",
    ...over,
  });

  beforeEach(() => {
    clearMemory();
  });

  it("ranks by cosine similarity (closest first) and honours topK", async () => {
    await upsertVectors([
      item({ id: "near", vector: [1, 0.1, 0] }),
      item({ id: "mid", vector: [1, 1, 0] }),
      item({ id: "far", vector: [0, 1, 0] }),
    ]);

    const hits = searchVectors([1, 0, 0], { topK: 2, projectId: "p1" });
    expect(hits.map((h) => h.id)).toEqual(["near", "mid"]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });

  it("skips vectors whose dimensionality differs from the query", async () => {
    await upsertVectors([
      item({ id: "ok", vector: [1, 0, 0] }),
      item({ id: "wrongdim", vector: [1, 0, 0, 0] }),
    ]);
    const hits = searchVectors([1, 0, 0], { topK: 10, projectId: "p1" });
    expect(hits.map((h) => h.id)).toEqual(["ok"]);
  });

  it("filters by embedding model so spaces aren't mixed", async () => {
    await upsertVectors([
      item({ id: "a", model: "nomic-embed-text", vector: [1, 0, 0] }),
      item({ id: "b", model: "mxbai-embed-large", vector: [1, 0, 0] }),
    ]);
    const hits = searchVectors([1, 0, 0], {
      topK: 10,
      projectId: "p1",
      model: "mxbai-embed-large",
    });
    expect(hits.map((h) => h.id)).toEqual(["b"]);
  });

  it("excludes a document for cross-document 'find similar'", async () => {
    await upsertVectors([
      item({ id: "self", documentId: "d1", vector: [1, 0, 0] }),
      item({ id: "other", documentId: "d2", vector: [1, 0, 0] }),
    ]);
    const hits = searchVectors([1, 0, 0], {
      topK: 10,
      projectId: "p1",
      excludeDocumentId: "d1",
    });
    expect(hits.map((h) => h.id)).toEqual(["other"]);
  });

  it("scopes results to a single project", async () => {
    await upsertVectors([
      item({ id: "p1-hit", projectId: "p1", vector: [1, 0, 0] }),
      item({ id: "p2-hit", projectId: "p2", vector: [1, 0, 0] }),
    ]);
    const hits = searchVectors([1, 0, 0], { topK: 10, projectId: "p1" });
    expect(hits.map((h) => h.id)).toEqual(["p1-hit"]);
  });
});
