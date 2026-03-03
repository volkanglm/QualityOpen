import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, ScanLine, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PdfRendererProps {
  /** base64-encoded PDF data */
  base64: string;
  /** Called when OCR extracts text from a scanned PDF */
  onOcrComplete?: (text: string) => void;
  /** Called when all pages are loaded/text extracted to report total text length */
  onLoadComplete?: (totalLength: number) => void;
}

export function PdfRenderer({ base64, onOcrComplete, onLoadComplete }: PdfRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTextLayer, setHasTextLayer] = useState(true);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [pagesData, setPagesData] = useState<{ id: number; text: string }[]>([]);

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
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
        const extractedPages: { id: number; text: string }[] = [];
        let totalLen = 0;
        let anyText = false;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((it: any) => it.str).join(" ");
          if (pageText.trim()) anyText = true;
          extractedPages.push({ id: i, text: pageText });
          totalLen += pageText.length + 1; // +1 for newline/space between pages
        }

        if (cancelled) return;
        setPagesData(extractedPages);
        setHasTextLayer(anyText);
        onLoadComplete?.(totalLen);
        setLoading(false);
      } catch (e) {
        console.error("PDF loading error:", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "PDF dosyası yüklenemedi.");
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

        const blob = await new Promise<Blob>((resolve) => {
          offCanvas.toBlob((b) => resolve(b!), "image/png");
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Tesseract = (window as any).Tesseract ?? await loadTesseract();
        const { data } = await Tesseract.recognize(blob, "tur+eng", {
          logger: (m: { progress: number }) => {
            if (m.progress) {
              const pageProgress = ((i - 1) + m.progress) / pdf.numPages;
              setOcrProgress(Math.round(pageProgress * 100));
            }
          },
        });
        allText.push(data.text.trim());
      }

      const fullText = allText.join("\n\n---\n\n");
      setOcrStatus("done");
      setOcrProgress(100);
      onOcrComplete?.(fullText);
    } catch (e) {
      console.error("OCR error:", e);
      setOcrStatus("error");
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-[11px] tabular-nums font-medium w-12 text-center" style={{ color: "var(--text-secondary)" }}>
            {Math.round(scale * 100)}%
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
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
          />
        ))}
      </div>
    </div>
  );
}

/** Individual Page Component */
function PdfPage({ pdf, pageNumber, scale }: { pdf: any; pageNumber: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

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

      for (const item of textContent.items) {
        const ti = item as any;
        if (!ti.str) continue;
        const tx = ti.transform;
        const span = document.createElement("span");
        span.textContent = ti.str;
        span.style.position = "absolute";
        span.style.left = `${tx[4]}px`;
        span.style.top = `${viewport.height - tx[5] - ti.height}px`;
        span.style.fontSize = `${ti.height}px`;
        span.style.fontFamily = ti.fontName || "sans-serif";
        span.style.color = "transparent";
        span.style.whiteSpace = "pre";
        span.style.lineHeight = "1";
        span.style.transformOrigin = "0% 0%";
        textLayer.appendChild(span);
      }
      setRendered(true);
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, pageNumber, scale]);

  return (
    <div className="relative shadow-xl mx-auto border transition-opacity duration-500"
      style={{
        borderColor: "var(--border-subtle)",
        background: "#fff",
        opacity: rendered ? 1 : 0.6
      }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <div
        ref={textLayerRef}
        className="absolute inset-0 overflow-hidden"
        style={{
          userSelect: "text",
          cursor: "text",
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}

// ─── Helper: Load Tesseract.js ───────────────────────────────────────────────
async function loadTesseract() {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).Tesseract) return resolve((window as any).Tesseract);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve((window as any).Tesseract);
    script.onerror = () => reject(new Error("Tesseract.js yüklenemedi"));
    document.head.appendChild(script);
  });
}
