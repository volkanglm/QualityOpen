import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code, Document as QODocument, Segment } from "@/types";
import { truncate } from "@/lib/utils";
import { flattenCodes } from "@/lib/tree";
import { SegmentDrawer } from "@/components/analysis/SegmentDrawer";
import { useT } from "@/lib/i18n";
import { Download } from "lucide-react";
import { useVisualThemeStore } from "@/store/visualTheme.store";

interface HeatmapProps {
  codes: Code[];
  docs: QODocument[];
  segments: Segment[];
  zoom?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeatmapMatrix({ codes, docs, segments, zoom = 1.0 }: HeatmapProps) {
  const t = useT();
  const [hoveredCell, setHoveredCell] = useState<{ codeId: string; docId: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<{ codeId: string; docId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getCodeColor } = useVisualThemeStore();

  const flatCodes = flattenCodes(codes, undefined, 0);

  if (codes.length === 0 || docs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("analysis.matrixRequired")}
        </p>
      </div>
    );
  }

  // Build matrix: matrix[codeId][docId] = segment count
  const matrix: Record<string, Record<string, number>> = {};
  codes.forEach((c) => {
    matrix[c.id] = {};
    docs.forEach((d) => { matrix[c.id][d.id] = 0; });
  });
  segments.forEach((s) => {
    s.codeIds.forEach((cid: string) => {
      if (matrix[cid]?.[s.documentId] !== undefined) {
        matrix[cid][s.documentId]++;
      }
    });
  });

  const allCounts = Object.values(matrix).flatMap((row) => Object.values(row));
  const maxCount = Math.max(...allCounts, 1);

  const handleExport = async (format: "png" | "jpeg") => {
    if (!containerRef.current) return;
    const { exportElementAsImage } = await import("@/lib/exportChart");
    await exportElementAsImage(containerRef.current, "heatmap-matrix", format);
  };

  const CELL = 40 * zoom;
  const LABEL_W = 130 * zoom;
  const HEADER_H = 92 * zoom;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-auto custom-scrollbar p-6">
      {/* Column headers (rotated document names) */}
      <div style={{ display: "flex", paddingLeft: LABEL_W, marginBottom: 0 }}>
        {docs.map((doc) => (
          <div
            key={doc.id}
            style={{
              width: CELL,
              height: HEADER_H,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: CELL / 2 - 4,
                transform: "rotate(-42deg)",
                transformOrigin: "left bottom",
                fontSize: Math.max(8, 10 * zoom),
                color: "var(--text-muted)",
                opacity: 0.7,
                whiteSpace: "nowrap",
                fontWeight: 500,
                maxWidth: 72 * zoom,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {truncate(doc.name, 14)}
            </div>
          </div>
        ))}
      </div>

      {/* Local Export Button */}
      <div className="absolute top-4 right-4 z-10 flex gap-1 no-export">
        <div className="relative group/export-local">
          <button className="p-2 rounded-xl bg-[var(--bg-tertiary)]/80 border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all shadow-lg">
            <Download className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <div className="absolute top-full right-0 mt-2 w-32 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl py-1 invisible group-hover/export-local:visible opacity-0 group-hover/export-local:opacity-100 transition-all scale-95 group-hover/export-local:scale-100">
            <button onClick={() => handleExport("png")} className="w-full text-left px-4 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-hover)] transition-colors">PNG</button>
            <button onClick={() => handleExport("jpeg")} className="w-full text-left px-4 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-hover)] transition-colors">JPG</button>
          </div>
        </div>
      </div>

      {flatCodes.map((code, ri) => {
        const color = getCodeColor(ri, code.color);
        return (
          <div
            key={code.id}
            style={{ display: "flex", alignItems: "center", marginBottom: 3 * zoom }}
          >
            {/* Code label with indentation */}
            <div
              style={{
                width: LABEL_W,
                flexShrink: 0,
                paddingRight: 10 * zoom,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6 * zoom,
                paddingLeft: code.depth * 12 * zoom,
              }}
            >
              <span
                style={{
                  width: 6 * zoom,
                  height: 6 * zoom,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  opacity: code.depth === 0 ? 1 : 0.6,
                }}
              />
              <span
                style={{
                  fontSize: Math.max(8, 11 * zoom),
                  color: "var(--text-secondary)",
                  fontWeight: code.depth === 0 ? 600 : 400,
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  opacity: code.depth === 0 ? 0.9 : 0.6,
                }}
              >
                {truncate(code.name, Math.max(8, Math.floor(16 - code.depth * 2)))}
              </span>
            </div>

            {/* Cells */}
            {docs.map((doc, ci) => {
              const count = matrix[code.id]?.[doc.id] ?? 0;
              const isHov = hoveredCell?.codeId === code.id && hoveredCell?.docId === doc.id;
              const opacity = count > 0 ? 0.12 + (count / maxCount) * 0.78 : 0;

              return (
                <div
                  key={doc.id}
                  style={{ position: "relative", flexShrink: 0 }}
                  onMouseEnter={() => setHoveredCell({ codeId: code.id, docId: doc.id })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onDoubleClick={() => {
                    if (count > 0) {
                      setDrawerContext({ codeId: code.id, docId: doc.id });
                      setDrawerOpen(true);
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: (ri * docs.length + ci) * 0.008,
                      type: "spring",
                      stiffness: 420,
                      damping: 30,
                    }}
                    style={{
                      width: CELL - 4,
                      height: CELL - 4,
                      margin: 2,
                      borderRadius: 6,
                      background: count > 0 ? color : "var(--surface)",
                      opacity: count > 0 ? opacity : 0.3,
                      border: isHov
                        ? `2px solid ${color}`
                        : "2px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "default",
                      transition: "border-color 0.12s, opacity 0.12s",
                    }}
                  >
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          opacity: 0.85,
                          fontFamily: "'SF Mono','Fira Code',monospace",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </motion.div>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHov && (
                      <motion.div
                        key="tooltip"
                        initial={{ opacity: 0, y: -4, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 6px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          zIndex: 50,
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "5px 10px",
                          whiteSpace: "nowrap",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          boxShadow: "var(--float-shadow)",
                          pointerEvents: "none",
                        }}
                      >
                        <span style={{ color: color }}>●</span>{" "}
                        {code.name}
                        <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>×</span>
                        {truncate(doc.name, 12)}
                        <span
                          style={{
                            marginLeft: 6,
                            color: "var(--text-muted)",
                            fontFamily: "monospace",
                          }}
                        >
                          {count === 0 ? "—" : `${count}`}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Row total */}
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                color: "var(--text-disabled)",
                fontFamily: "'SF Mono','Fira Code',monospace",
                width: 24,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {Object.values(matrix[code.id] ?? {}).reduce((a, b) => a + b, 0) || ""}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div
        style={{
          marginTop: 20 * zoom,
          paddingLeft: LABEL_W + 4 * zoom,
          display: "flex",
          alignItems: "center",
          gap: 6 * zoom,
        }}
      >
        <span style={{ fontSize: Math.max(8, 10 * zoom), color: "var(--text-disabled)" }}>{t("analysis.few")}</span>
        {[0.12, 0.30, 0.50, 0.70, 0.90].map((op, k) => (
          <div
            key={k}
            style={{
              width: 14 * zoom,
              height: 14 * zoom,
              borderRadius: 3 * zoom,
              background: "var(--text-primary)",
              opacity: op,
            }}
          />
        ))}
        <span style={{ fontSize: Math.max(8, 10 * zoom), color: "var(--text-disabled)" }}>{t("analysis.many")}</span>
        <span style={{ marginLeft: 12 * zoom, fontSize: Math.max(8, 10 * zoom), color: "var(--text-disabled)" }}>
          {t("analysis.matrixLegend")}
        </span>
      </div>

      {drawerContext && (
        <SegmentDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          code={codes.find(c => c.id === drawerContext.codeId) || null as any}
          filterDocIds={[drawerContext.docId]}
        />
      )}
    </div>
  );
}
