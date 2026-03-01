import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code, Document as QODocument, Segment } from "@/types";
import { truncate } from "@/lib/utils";
import { flattenCodes } from "@/lib/tree";

interface HeatmapProps {
  codes: Code[];
  docs: QODocument[];
  segments: Segment[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HeatmapMatrix({ codes, docs, segments }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ codeId: string; docId: string } | null>(null);

  const flatCodes = flattenCodes(codes, undefined, 0);

  if (codes.length === 0 || docs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Matris için en az bir belge ve bir kod gerekli.
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

  const CELL = 40;
  const LABEL_W = 130;
  const HEADER_H = 92;

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", padding: "20px 24px 24px" }}>
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
                fontSize: 10,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                fontWeight: 500,
                maxWidth: 72,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {truncate(doc.name, 14)}
            </div>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {flatCodes.map((code, ri) => (
        <div
          key={code.id}
          style={{ display: "flex", alignItems: "center", marginBottom: 3 }}
        >
          {/* Code label with indentation */}
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              paddingRight: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              paddingLeft: code.depth * 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: code.color,
                flexShrink: 0,
                opacity: code.depth === 0 ? 1 : 0.6,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: code.depth === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: code.depth === 0 ? 600 : 400,
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: code.depth === 0 ? 1 : 0.8,
              }}
            >
              {truncate(code.name, 16 - code.depth * 2)}
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
                    background: count > 0 ? code.color : "var(--surface)",
                    opacity: count > 0 ? opacity : 0.3,
                    border: isHov
                      ? `2px solid ${code.color}`
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
                      <span style={{ color: code.color }}>●</span>{" "}
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
      ))}

      {/* Legend */}
      <div
        style={{
          marginTop: 20,
          paddingLeft: LABEL_W + 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-disabled)" }}>Az</span>
        {[0.12, 0.30, 0.50, 0.70, 0.90].map((op, k) => (
          <div
            key={k}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: "var(--accent)",
              opacity: op,
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: "var(--text-disabled)" }}>Çok</span>
        <span style={{ marginLeft: 12, fontSize: 10, color: "var(--text-disabled)" }}>
          (Her hücre: bir belgedeki segment sayısı)
        </span>
      </div>
    </div>
  );
}
