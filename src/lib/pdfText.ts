// ─── PDF text extraction ─────────────────────────────────────────────────────
//
// Extracts the plain text layer from a base64-encoded PDF using pdf.js (the same
// engine the viewer uses). Used to feed semantic search — a PDF document's
// `content` is the base64 binary, NOT searchable text.

let workerConfigured = false;

export async function extractPdfText(base64: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    // Locally-bundled worker (no CDN) — Vite copies it into dist at build time.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    workerConfigured = true;
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const pdf = await pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const pageText = (tc.items as Array<{ str?: string }>)
      .map((it) => it.str ?? "")
      .join(" ");
    parts.push(pageText);
  }
  // Collapse the messy per-item whitespace into single spaces.
  return parts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
