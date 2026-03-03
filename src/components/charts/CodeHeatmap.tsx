import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code, Document, Segment } from "@/types";

interface CodeHeatmapProps {
    codes: Code[];
    docs: Document[];
    segments: Segment[];
    zoom?: number;
}

export const CodeHeatmap = memo(({ codes, docs, segments, zoom = 1.0 }: CodeHeatmapProps) => {
    const [hoveredCell, setHoveredCell] = useState<{ codeId: string; docId: string; count: number } | null>(null);

    // Filter to avoid empty grid if no codes/docs
    const displayCodes = codes.slice(0, 15); // Limit for readability in dashboard
    const displayDocs = docs.slice(0, 10);

    const rowHeight = 42 * zoom;
    const labelWidth = 160 * zoom;
    const cellWidth = 64 * zoom;

    return (
        <div className="relative w-full h-full p-4 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <div
                    className="grid gap-px bg-[var(--border)] p-px rounded-sm shadow-sm"
                    style={{
                        gridTemplateColumns: `${labelWidth}px repeat(${displayDocs.length}, ${cellWidth}px)`,
                        gridAutoRows: `${rowHeight}px`,
                        width: "fit-content"
                    }}
                >
                    {/* Header Row */}
                    <div
                        className="bg-[var(--bg-secondary)]/80 p-3 font-bold uppercase tracking-wider text-[var(--text-muted)] sticky top-0 left-0 z-20 flex items-center justify-center border-b border-r border-[var(--border)]"
                        style={{ fontSize: Math.max(7, 9 * zoom) }}
                    >
                        Kodlar \ Belgeler
                    </div>
                    {displayDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="bg-[var(--bg-secondary)]/80 px-2 py-3 font-bold uppercase tracking-wider text-[var(--text-muted)] truncate text-center sticky top-0 z-10 flex items-center justify-center border-b border-[var(--border)]"
                            style={{
                                fontSize: Math.max(7, 9 * zoom),
                                minWidth: cellWidth
                            }}
                            title={doc.name}
                        >
                            {doc.name}
                        </div>
                    ))}

                    {/* Data Rows */}
                    {displayCodes.map((code) => (
                        <React.Fragment key={code.id}>
                            <div
                                className="bg-[var(--bg-secondary)]/50 px-3 py-1 font-medium text-[var(--text-secondary)] truncate sticky left-0 z-10 border-r border-[var(--border)] flex items-center"
                                style={{
                                    fontSize: Math.max(9, 11 * zoom),
                                    height: rowHeight
                                }}
                            >
                                {code.name}
                            </div>
                            {displayDocs.map((doc) => {
                                const count = segments.filter(s => s.documentId === doc.id && s.codeIds.includes(code.id)).length;
                                const maxInRow = Math.max(...displayDocs.map(d =>
                                    segments.filter(s => s.documentId === d.id && s.codeIds.includes(code.id)).length
                                ), 1);

                                // Opacity based on usage: 12% to 100%
                                const opacity = count === 0 ? 0 : Math.max(0.12, count / maxInRow);

                                return (
                                    <motion.div
                                        key={`${code.id}-${doc.id}`}
                                        className="relative transition-colors cursor-crosshair group bg-[var(--bg-tertiary)]/20"
                                        style={{ height: rowHeight, width: cellWidth }}
                                        onMouseEnter={() => setHoveredCell({ codeId: code.id, docId: doc.id, count })}
                                        onMouseLeave={() => setHoveredCell(null)}
                                    >
                                        {count > 0 && (
                                            <motion.div
                                                className="absolute inset-[2px] rounded-[1px]"
                                                style={{
                                                    backgroundColor: code.color,
                                                    opacity: opacity
                                                }}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: opacity }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}

                                        {/* Hover Glow */}
                                        <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors z-10" />
                                    </motion.div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Minimalist Tooltip */}
            <AnimatePresence>
                {hoveredCell && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-6 right-6 z-30 pointer-events-none"
                    >
                        <div className="bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-md px-3 py-2 rounded-md shadow-2xl">
                            <p className="text-[11px] text-[var(--text-primary)] leading-relaxed tabular-nums">
                                <span className="font-bold" style={{ color: codes.find(c => c.id === hoveredCell.codeId)?.color }}>
                                    {codes.find(c => c.id === hoveredCell.codeId)?.name}
                                </span>
                                {" "}kodu,{" "}
                                <span className="text-[var(--text-secondary)]">
                                    {docs.find(d => d.id === hoveredCell.docId)?.name}
                                </span>
                                {" "}belgesinde{" "}
                                <span className="font-bold text-[var(--text-primary)]">{hoveredCell.count}</span>
                                {" "}kez kullanıldı.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

CodeHeatmap.displayName = "CodeHeatmap";
