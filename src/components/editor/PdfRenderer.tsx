import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PdfRendererProps {
  /** base64-encoded PDF data (without data URL prefix) */
  base64: string;
}

export function PdfRenderer({ base64 }: PdfRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pdfjs stored in ref to avoid re-import
  const pdfDocRef = useRef<{
    getPage: (n: number) => Promise<{
      getViewport: (opts: { scale: number }) => { width: number; height: number };
      render: (ctx: {
        canvasContext: CanvasRenderingContext2D;
        viewport: ReturnType<ReturnType<{ getPage: (n: number) => { getViewport: (opts: { scale: number }) => unknown } }["getPage"]>["getViewport"]>;
      }) => { promise: Promise<void> };
    }>;
    numPages: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await import("pdfjs-dist");

        // Set worker source — use the versioned worker from the library itself if possible,
        // but CDN is safer for Tauri environments where local assets might have path issues.
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

        // @ts-ignore
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (e) {
        console.error("PDF loading error:", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "PDF dosyası yüklenemedi. Lütfen dosyanın bozuk olmadığından emin olun.");
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [base64]);

  useEffect(() => {
    if (!pdfDocRef.current || loading) return;
    let cancelled = false;

    async function renderPage() {
      const pdf = pdfDocRef.current!;
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        // @ts-ignore
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelled) return;
        // @ts-ignore
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        // silent
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [currentPage, scale, loading]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
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
          Loading PDF…
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Controls */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-1.5 shadow-sm"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {currentPage} / {totalPages}
        </span>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div
          className="w-px h-4 mx-1"
          style={{ background: "var(--border)" }}
        />

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <span className="text-[11px] tabular-nums w-9 text-center" style={{ color: "var(--text-secondary)" }}>
          {Math.round(scale * 100)}%
        </span>

        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setScale((s) => Math.min(3, s + 0.15))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        className="rounded-[var(--radius-md)] overflow-hidden shadow-lg"
        style={{ border: "1px solid var(--border)" }}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
    </div>
  );
}
