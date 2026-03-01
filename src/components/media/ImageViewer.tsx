import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

interface ImageViewerProps {
  src: string;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export function ImageViewer({ src }: ImageViewerProps) {
  const [scale,  setScale]  = useState(1);
  const [error,  setError]  = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const zoom = useCallback((delta: number) => {
    setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(s + delta).toFixed(2))));
  }, []);

  const reset = () => setScale(1);

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Görüntü yüklenemedi.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Image area */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        style={{ background: "var(--bg-primary)", cursor: scale > 1 ? "grab" : "default" }}
        onWheel={handleWheel}
      >
        <motion.img
          ref={imgRef}
          src={src}
          alt="Document image"
          onError={() => setError(true)}
          animate={{ scale }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
          style={{ transformOrigin: "center" }}
        />
      </div>

      {/* Zoom controls */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-2 border-t px-4 py-2"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        <Tooltip content="Yakınlaştır (scroll)" side="top">
          <button
            onClick={() => zoom(0.2)}
            className="h-6 w-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <span
          className="text-[11px] font-mono tabular-nums min-w-[44px] text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          {Math.round(scale * 100)}%
        </span>

        <Tooltip content="Uzaklaştır" side="top">
          <button
            onClick={() => zoom(-0.2)}
            className="h-6 w-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

        <Tooltip content="Sıfırla" side="top">
          <button
            onClick={reset}
            className="h-6 w-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
