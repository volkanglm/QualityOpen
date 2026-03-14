import { useEffect, useRef, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, ScanLine, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Segment, Code } from "@/types";
import { useToastStore } from "@/store/toast.store";
import { useAppStore } from "@/store/app.store";
import { t } from "@/lib/i18n";

interface PdfTextItem {
  str?: string;
  transform?: number[];
  height?: number;
  width?: number;
  fontName?: string;
}

interface PdfRendererProps {
  /** base64-encoded PDF data */
  base64: string;
  /** Called when OCR extracts text from a scanned PDF */
  onOcrComplete?: (text: string) => void;
  /** Called when all pages are loaded/text extracted to report total text length */
  onLoadComplete?: (totalLength: number) => void;
  /** Segments to highlight on the PDF */
  segments?: Segment[];
  /** Codes for segment colors */
  codes?: Code[];
}

/** Individual Page Component */
const PdfPage = memo(function PdfPage({
  pdf,
  pageNumber,
  scale,
  pageStartOffset = 0,
  segments,
  codes,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  pageNumber: number;
  scale: number;
  pageStartOffset?: number;
  segments?: Segment[];
  codes?: Code[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [renderVersion, setRenderVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!pdf) return;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const textLayer = textLayerRef.current;
      if (!canvas || !textLayer || cancelled) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Text Layer
      textLayer.innerHTML = "";
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      const textContent = await page.getTextContent();
      if (cancelled) return;

      // Build spans with character offset attributes for selection → segment mapping
      let charOffset = pageStartOffset;
      const items = (textContent.items as PdfTextItem[]).filter((it): it is PdfTextItem & { str: string } => Boolean(it.str));

      for (let idx = 0; idx < items.length; idx++) {
        const ti = items[idx];
        const tx = ti.transform || [1, 0, 0, 1, 0, 0];
        const span = document.createElement("span");
        span.textContent = ti.str;
        // Track character positions so we can map selections ↔ segments
        span.dataset.charStart = String(charOffset);
        span.dataset.charEnd = String(charOffset + ti.str.length);
        // +1 for the " " separator used during extraction — but NOT after the last item
        charOffset += ti.str.length + (idx < items.length - 1 ? 1 : 0);
        span.style.position = "absolute";
        // Apply scale to coordinates! tx[4] is X, tx[5] is Y (from bottom).
        const x = tx[4] * scale;
        const y = tx[5] * scale;
        const height = (ti.height || tx[3]) * scale;
        // Fallback width: estimate from character count × average char width
        const width = (ti.width && ti.width > 0) ? ti.width * scale : ti.str.length * height * 0.55;

        span.style.left = `${x}px`;
        span.style.top = `${viewport.height - y - height}px`;
        span.style.fontSize = `${height}px`;
        span.style.width = `${width}px`;
        span.style.height = `${height}px`;
        span.style.fontFamily = ti.fontName || "sans-serif";
        span.style.color = "transparent";
        span.style.whiteSpace = "pre";
        span.style.lineHeight = "1";
        span.style.transformOrigin = "0% 0%";
        span.style.borderRadius = "2px";
        textLayer.appendChild(span);
      }
      // Increment version to trigger highlight re-application (works even on re-render/zoom)
      setRenderVersion(v => v + 1);
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, pageNumber, scale, pageStartOffset]);

  // Apply highlight backgrounds whenever render completes or segments/codes change
  useEffect(() => {
    if (renderVersion === 0 || !textLayerRef.current) return;
    applyPdfHighlights(textLayerRef.current, segments ?? [], codes ?? []);
  }, [renderVersion, segments, codes]);

  return (
    <div className="relative shadow-xl mx-auto border transition-opacity duration-500"
      style={{
        borderColor: "var(--border-subtle)",
        background: "#fff",
        opacity: renderVersion > 0 ? 1 : 0.6
      }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <div
        ref={textLayerRef}
        data-pdf-text-layer="true"
        className="absolute inset-0 overflow-hidden"
        style={{
          userSelect: "text",
          cursor: "text",
          zIndex: 2,
          pointerEvents: "auto",
        }}
      />
    </div>
  );
});

export const PdfRenderer = memo(function PdfRenderer({ base64, onOcrComplete, onLoadComplete, segments, codes }: PdfRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTextLayer, setHasTextLayer] = useState(true);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [pagesData, setPagesData] = useState<{ id: number; text: string; startOffset: number }[]>([]);

  // pdfjs stored in ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await import("pdfjs-dist");
        // Security: use locally-bundled worker instead of an external CDN.
        // Vite resolves `new URL(...)` at build time and copies the worker
        // into the dist output — no network request, no supply-chain risk.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).href;

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const loadingTask = pdfjs.getDocument({
          data: bytes,
          useWorkerFetch: false,
          isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        // Extract text from all pages for global offset sync
        const extractedPages: { id: number; text: string; startOffset: number }[] = [];
        let totalLen = 0;
        let anyText = false;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // Filter to items with actual text (matches the text layer building logic)
          const strs = (textContent.items as PdfTextItem[])
            .map((it) => it.str)
            .filter((s): s is string => Boolean(s));
          const pageText = strs.join(" ");
          if (pageText.trim()) anyText = true;
          extractedPages.push({ id: i, text: pageText, startOffset: totalLen });
          // Page text has N-1 separators (from join). The text layer loop also uses N-1 separators.
          // Between pages we add +1 for the page boundary separator.
          totalLen += pageText.length + (i < pdf.numPages ? 1 : 0);
        }

        if (cancelled) return;
        setPagesData(extractedPages);
        setHasTextLayer(anyText);
        onLoadComplete?.(totalLen);
        setLoading(false);
      } catch (e) {
        console.error("PDF loading error:", e);
        if (!cancelled) {
          const lang = useAppStore.getState().language;
          setError(e instanceof Error ? e.message : t("pdf.loadError", lang));
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [base64, onLoadComplete]);

  // OCR handler
  const handleOcr = useCallback(async () => {
    if (!pdfDocRef.current || ocrStatus === "running") return;
    setOcrStatus("running");
    setOcrProgress(0);

    try {
      const pdf = pdfDocRef.current;
      const allText: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setOcrProgress(Math.round(((i - 1) / pdf.numPages) * 100));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const offCanvas = document.createElement("canvas");
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const ctx = offCanvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          offCanvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
        });

        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker(["tur", "eng"], 1, {
          logger: (m: { progress: number }) => {
            if (m.progress) {
              const pageProgress = ((i - 1) + m.progress) / pdf.numPages;
              setOcrProgress(Math.round(pageProgress * 100));
            }
          },
        });
        const { data } = await worker.recognize(blob);
        await worker.terminate();
        allText.push(data.text.trim());
      }

      const fullText = allText.join("\n\n---\n\n");
      setOcrStatus("done");
      setOcrProgress(100);
      onOcrComplete?.(fullText);
    } catch (e) {
      console.error("OCR error:", e);
      setOcrStatus("error");
      const lang = useAppStore.getState().language;
      useToastStore.getState().push(t("ocr.error", lang), "error");
    }
  }, [ocrStatus, onOcrComplete]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          PDF Hazırlanıyor…
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto pb-20">
      {/* OCR & Zoom Controls */}
      <div className="sticky top-0 z-20 w-full flex flex-col gap-2">
        <AnimatePresence>
          {!hasTextLayer && ocrStatus !== "done" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: "var(--warning, #f59e0b)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>Taranmış belge algılandı</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {ocrStatus === "running" ? `OCR işleniyor… %${ocrProgress}` : "Metne çevirerek üzerinde kodlama yapabilirsiniz."}
                </p>
                {ocrStatus === "running" && (
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: "var(--accent)" }}
                      animate={{ width: `${ocrProgress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                )}
              </div>
              {ocrStatus !== "running" && (
                <Button variant="primary" size="sm" onClick={handleOcr} className="flex-shrink-0">
                  <ScanLine className="h-3.5 w-3.5 mr-1" /> OCR Başlat
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 rounded-full border px-4 py-1.5 shadow-sm mx-auto"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Uzaklaştır" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-[11px] tabular-nums font-medium w-12 text-center" style={{ color: "var(--text-secondary)" }}>
            {Math.round(scale * 100)}%
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Yakınlaştır" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            {totalPages} Sayfa
          </span>
        </div>
      </div>

      {/* Pages Container */}
      <div ref={containerRef} className="flex flex-col gap-8 w-full group/pdf">
        {pagesData.map((pageData) => (
          <PdfPage
            key={pageData.id}
            pdf={pdfDocRef.current}
            pageNumber={pageData.id}
            scale={scale}
            pageStartOffset={pageData.startOffset}
            segments={segments}
            codes={codes}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Helper: Apply highlight backgrounds to PDF text layer spans ──────────────
function applyPdfHighlights(textLayer: HTMLDivElement, segments: Segment[], codes: Code[]) {
  // Remove previously injected highlight overlay elements
  textLayer.querySelectorAll<HTMLElement>(".pdf-highlight-overlay").forEach(el => el.remove());

  const spans = textLayer.querySelectorAll<HTMLElement>("span[data-char-start]");
  // Reset all span highlights first
  for (const span of spans) {
    span.style.backgroundColor = "";
    span.style.borderBottom = "";
  }
  if (!segments.length) return;

  // Build a lookup of text content by offset for validation
  const spanList: { start: number; end: number; text: string }[] = [];
  for (const span of spans) {
    spanList.push({
      start: parseInt(span.dataset.charStart ?? "0", 10),
      end: parseInt(span.dataset.charEnd ?? "0", 10),
      text: span.textContent ?? "",
    });
  }

  // Pre-validate segments: skip those whose stored text doesn't match the text layer
  const validSegments = segments.filter(seg => {
    if (!seg.text) return true; // no stored text to compare — allow
    // Reconstruct text at the segment's offset range from spans
    let reconstructed = "";
    for (const s of spanList) {
      if (s.end <= seg.start || s.start >= seg.end) continue;
      const overlapStart = Math.max(seg.start, s.start);
      const overlapEnd = Math.min(seg.end, s.end);
      const localStart = overlapStart - s.start;
      const localEnd = overlapEnd - s.start;
      reconstructed += s.text.slice(localStart, localEnd) + " ";
    }
    reconstructed = reconstructed.trim();
    // Fuzzy match: compare normalized (whitespace-collapsed, lowered)
    const normalize = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
    const stored = normalize(seg.text);
    const actual = normalize(reconstructed);
    if (stored && actual && stored !== actual) {
      // Allow if one contains the other (partial overlap is fine)
      if (!stored.includes(actual) && !actual.includes(stored)) {
        console.warn("[PDF Highlight] Text mismatch — segment may be misaligned:", {
          segmentId: seg.id, stored: seg.text, actual: reconstructed, start: seg.start, end: seg.end,
        });
        return false; // skip this misaligned segment
      }
    }
    return true;
  });

  for (const span of spans) {
    const spanStart = parseInt(span.dataset.charStart ?? "0", 10);
    const spanEnd = parseInt(span.dataset.charEnd ?? "0", 10);
    const spanLen = spanEnd - spanStart;
    if (spanLen <= 0) continue;

    for (const seg of validSegments) {
      if (seg.end <= spanStart || seg.start >= spanEnd) continue; // no overlap

      // Determine color: code color > highlight color > default yellow
      let color = seg.highlightColor ?? "#fcd34d";
      if (seg.codeIds?.length > 0) {
        const code = codes.find((c) => c.id === seg.codeIds[0]);
        if (code?.color) color = code.color;
      }

      // Check if segment fully covers the span
      const overlapStart = Math.max(seg.start, spanStart);
      const overlapEnd = Math.min(seg.end, spanEnd);
      const isFullCoverage = overlapStart <= spanStart && overlapEnd >= spanEnd;

      if (isFullCoverage) {
        // Full span highlight — simple case
        span.style.backgroundColor = `${color}55`;
        span.style.borderBottom = `2px solid ${color}`;
      } else {
        // Partial span highlight — create an overlay div for just the covered portion
        const spanWidth = parseFloat(span.style.width) || span.offsetWidth;
        const charRatioStart = (overlapStart - spanStart) / spanLen;
        const charRatioEnd = (overlapEnd - spanStart) / spanLen;

        const overlay = document.createElement("span");
        overlay.className = "pdf-highlight-overlay";
        overlay.style.position = "absolute";
        overlay.style.top = span.style.top;
        overlay.style.left = `${parseFloat(span.style.left) + spanWidth * charRatioStart}px`;
        overlay.style.width = `${spanWidth * (charRatioEnd - charRatioStart)}px`;
        overlay.style.height = span.style.height;
        overlay.style.backgroundColor = `${color}55`;
        overlay.style.borderBottom = `2px solid ${color}`;
        overlay.style.pointerEvents = "none";
        overlay.style.borderRadius = "2px";
        textLayer.appendChild(overlay);
      }
    }
  }
}
