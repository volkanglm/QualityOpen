import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { Code, Document, Segment } from "@/types";

interface NarrativeFlowProps {
    codes: Code[];
    doc: Document | undefined;
    segments: Segment[];
    isProjectScope?: boolean;
    allDocs?: Document[];
    zoom?: number;
}

export const NarrativeFlow = memo(({ codes, doc, segments, isProjectScope, allDocs, zoom = 1.0 }: NarrativeFlowProps) => {
    const docSegments = useMemo(() => {
        if (isProjectScope) return [...segments].sort((a, b) => a.start - b.start);
        return segments.filter(s => s.documentId === doc?.id).sort((a, b) => a.start - b.start);
    }, [segments, doc?.id, isProjectScope]);

    const relevantCodes = useMemo(() => {
        const usedIds = new Set(docSegments.flatMap(s => s.codeIds));
        return codes.filter(c => usedIds.has(c.id));
    }, [codes, docSegments]);

    // Max length fallback
    const totalLength = doc?.wordCount || 1000;

    if (!isProjectScope && !doc) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-xs">
                Lütfen analiz için bir belge seçin.
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {isProjectScope ? "TÜM PROJE" : doc?.name} — Anlatı Akışı
                </h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-6 bg-[var(--bg-tertiary)] rounded-full" />
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">Belge Akışı (X)</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="relative flex flex-col gap-3 min-h-full">
                    {relevantCodes.map((code, idx) => {
                        const codeSegs = docSegments.filter(s => s.codeIds.includes(code.id));

                        return (
                            <div key={code.id} className="group flex flex-col gap-1.5">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                        {code.name}
                                    </span>
                                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                        {codeSegs.length} segment
                                    </span>
                                </div>

                                {/* Timeline Track */}
                                <div
                                    className="relative w-full bg-[var(--bg-tertiary)]/50 rounded-sm overflow-hidden"
                                    style={{ height: `${8 * zoom}px` }}
                                >
                                    {codeSegs.map((seg) => {
                                        let startPct = 0;
                                        let endPct = 0;

                                        if (isProjectScope && allDocs) {
                                            const d = allDocs.find(x => x.id === seg.documentId);
                                            const dLen = d?.wordCount || 1000;
                                            startPct = (seg.start / dLen) * 100;
                                            endPct = (seg.end / dLen) * 100;
                                        } else {
                                            startPct = (seg.start / totalLength) * 100;
                                            endPct = (seg.end / totalLength) * 100;
                                        }

                                        const widthPct = Math.max(0.5, endPct - startPct);

                                        return (
                                            <motion.div
                                                key={seg.id}
                                                className="absolute top-0 h-full rounded-sm"
                                                style={{
                                                    left: `${startPct}%`,
                                                    width: `${widthPct}%`,
                                                    backgroundColor: code.color,
                                                    boxShadow: `0 0 10px ${code.color}20`
                                                }}
                                                initial={{ opacity: 0, scaleX: 0 }}
                                                animate={{ opacity: 1, scaleX: 1 }}
                                                transition={{
                                                    delay: idx * 0.05 + Math.random() * 0.2,
                                                    duration: 0.4,
                                                    ease: [0.22, 1, 0.36, 1]
                                                }}
                                                whileHover={{ scaleY: 1.4, transition: { duration: 0.15 } }}
                                                title={`Segment: "${seg.text.slice(0, 50)}..."`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {relevantCodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center border border-dashed border-[var(--border)] rounded-lg">
                            <p className="text-[11px] text-[var(--text-muted)]">Bu belge henüz kodlanmamış.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* X-Axis Indicator */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent relative mt-4">
                <div className="absolute top-2 left-0 text-[8px] text-[var(--text-muted)] font-mono italic uppercase">BAŞLANGIÇ</div>
                <div className="absolute top-2 right-0 text-[8px] text-[var(--text-muted)] font-mono italic uppercase">SON</div>
            </div>
        </div>
    );
});

NarrativeFlow.displayName = "NarrativeFlow";
