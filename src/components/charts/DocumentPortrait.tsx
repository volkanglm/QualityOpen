import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { Code, Document, Segment } from "@/types";
import { useT } from "@/lib/i18n";
import { useVisualThemeStore } from "@/store/visualTheme.store";

interface DocumentPortraitProps {
    codes: Code[];
    doc: Document | undefined;
    segments: Segment[];
    isProjectScope?: boolean;
    allDocs?: Document[];
    zoom?: number;
}

export const DocumentPortrait = memo(({ codes, doc, segments, isProjectScope, allDocs, zoom = 1.0 }: DocumentPortraitProps) => {
    const t = useT();
    const { getCodeColor } = useVisualThemeStore();
    const activeSegments = useMemo(() => {
        if (isProjectScope) return [...segments].sort((a, b) => a.start - b.start);
        return segments.filter(s => s.documentId === doc?.id).sort((a, b) => a.start - b.start);
    }, [segments, doc?.id, isProjectScope]);

    // Divide document into "chunks" (chars or words)
    // For a "DNA map", we can treat each segment as a colored block and gaps as gray.
    // Let's create a representational grid of 100 blocks.
    // Divide document into a fixed number of "chunks" to maintain context
    const GRID_SIZE = 250;
    const totalLength = isProjectScope && allDocs
        ? allDocs.reduce((acc, d) => acc + (d.wordCount || 1000), 0)
        : (doc?.wordCount || 1000);

    const gridData = useMemo(() => {
        const blocks = [];
        const step = totalLength / GRID_SIZE;

        for (let i = 0; i < GRID_SIZE; i++) {
            const blockStart = i * step;
            const blockEnd = (i + 1) * step;

            const overlappingSeg = activeSegments.find(s => {
                const docIdx = allDocs?.findIndex(x => x.id === s.documentId) ?? -1;
                const prevDocsLen = allDocs?.slice(0, docIdx).reduce((acc, d) => acc + (d.wordCount || 1000), 0) ?? 0;
                const absoluteStart = prevDocsLen + s.start;
                const absoluteEnd = prevDocsLen + s.end;

                return (absoluteStart >= blockStart && absoluteStart < blockEnd) ||
                    (absoluteEnd > blockStart && absoluteEnd <= blockEnd) ||
                    (absoluteStart <= blockStart && absoluteEnd >= blockEnd);
            });

            if (overlappingSeg && overlappingSeg.codeIds.length > 0) {
                const firstCode = codes.find(c => c.id === overlappingSeg.codeIds[0]);
                const codeIdx = codes.findIndex(c => c.id === overlappingSeg.codeIds[0]);
                blocks.push({
                    id: i,
                    color: getCodeColor(codeIdx, firstCode?.color),
                    active: true,
                    text: overlappingSeg.text,
                    codeName: firstCode?.name
                });
            } else {
                blocks.push({ id: i, color: "transparent", active: false });
            }
        }
        return blocks;
    }, [activeSegments, codes, totalLength, isProjectScope, allDocs, getCodeColor]);

    if (!isProjectScope && !doc) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-xs">
                {t("analysis.selectDoc")}
            </div>
        );
    }

    const blockSize = 6 * zoom;

    return (
        <div className="w-full h-full p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between">
                <h3
                    className="font-bold uppercase tracking-widest text-[var(--text-muted)]"
                    style={{ fontSize: Math.max(8, 10 * zoom) }}
                >
                    {isProjectScope ? t("analysis.allProject") : doc?.name} — {t("analysis.documentPortrait")}
                </h3>
                <span
                    className="font-mono text-[var(--text-muted)] uppercase"
                    style={{ fontSize: Math.max(8, 9 * zoom) }}
                >
                    {t("analysis.dnaMap")} (1:{Math.round(totalLength / GRID_SIZE)})
                </span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar flex items-center justify-center p-4">
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: `repeat(25, ${blockSize}px)`,
                        gridAutoRows: `${blockSize}px`,
                        gap: `${Math.max(1, 2 * zoom)}px`
                    }}
                >
                    {gridData.map((block, idx) => (
                        <motion.div
                            key={block.id}
                            className={cn(
                                "rounded-[1px] transition-all",
                                block.active ? "" : "bg-[var(--bg-tertiary)]/80"
                            )}
                            style={{
                                width: blockSize,
                                height: blockSize,
                                ...(block.active ? { backgroundColor: block.color } : {})
                            }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                delay: idx * 0.002,
                                duration: 0.1,
                                ease: "easeOut"
                            }}
                            whileHover={{
                                scale: 1.5,
                                zIndex: 10,
                                boxShadow: block.active ? `0 0 ${8 * zoom}px ${block.color}cc` : "none"
                            }}
                            title={block.active ? `${block.codeName}: "${block.text?.slice(0, 40)}..."` : t("analysis.notCodedTitle")}
                        />
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-3 border-t border-[var(--border)]">
                {codes.filter(c => activeSegments.some(s => s.codeIds.includes(c.id))).map((c, idx) => (
                    <div key={c.id} className="flex items-center gap-1.5 grayscale-[0.5] hover:grayscale-0 transition-all">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCodeColor(idx, c.color) }} />
                        <span className="text-[10px] text-[var(--text-muted)]">{c.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Helper for Tailwind-like class merging if needed, but here simple
const cn = (...args: (string | undefined | boolean)[]) => args.filter(Boolean).join(" ");

DocumentPortrait.displayName = "DocumentPortrait";
