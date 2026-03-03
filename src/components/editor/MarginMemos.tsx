import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Segment, Code } from "@/types";

interface MarginMemosProps {
    segments: Segment[];
    codes: Code[];
    contentLength: number;
    containerHeight: number;
}

interface MemoBlock {
    id: string;
    memo: string;
    codeName: string;
    color: string;
    topPct: number;
    adjustedTop: number;
}

/**
 * Renders Notion-style margin memo cards in the right margin.
 * Cards are positioned to align with their segment's vertical position
 * and automatically offset to prevent overlap.
 */
export function MarginMemos({
    segments,
    codes,
    contentLength,
    containerHeight,
}: MarginMemosProps) {
    const memos = useMemo(() => {
        if (!contentLength || !containerHeight) return [];

        // Collect all segments that have a memo
        const raw: MemoBlock[] = segments
            .filter((s) => s.memo && s.memo.trim())
            .map((seg) => {
                const firstCode = codes.find((c) => seg.codeIds.includes(c.id));
                const topPct = (seg.start / contentLength) * 100;
                return {
                    id: seg.id,
                    memo: seg.memo!,
                    codeName: firstCode?.name ?? (seg.isHighlight ? "Not" : "Kod"),
                    color: seg.isHighlight
                        ? (seg.highlightColor ?? "#fcd34d")
                        : (firstCode?.color ?? "var(--accent)"),
                    topPct,
                    adjustedTop: topPct,
                };
            })
            .sort((a, b) => a.topPct - b.topPct);

        // Auto-layout: push overlapping memos down (min 6% gap)
        const MIN_GAP = 6;
        for (let i = 1; i < raw.length; i++) {
            const prev = raw[i - 1];
            if (raw[i].adjustedTop < prev.adjustedTop + MIN_GAP) {
                raw[i].adjustedTop = prev.adjustedTop + MIN_GAP;
            }
        }

        return raw;
    }, [segments, codes, contentLength, containerHeight]);

    if (memos.length === 0) return null;

    return (
        <div
            className="w-52 flex-shrink-0 relative select-none pl-3"
            style={{ minHeight: containerHeight }}
        >
            {memos.map((memo, idx) => (
                <motion.div
                    key={memo.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 0.2,
                        delay: idx * 0.04,
                        ease: [0.2, 0, 0, 1],
                    }}
                    className="absolute left-3 right-0 rounded-md border p-2.5 cursor-default"
                    style={{
                        top: `${memo.adjustedTop}%`,
                        background: "var(--bg-secondary)",
                        borderColor: "var(--border)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-1.5 mb-1">
                        <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: memo.color }}
                        />
                        <span
                            className="text-[10px] font-medium truncate"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {memo.codeName}
                        </span>
                    </div>

                    {/* Body */}
                    <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        {memo.memo.length > 120 ? memo.memo.slice(0, 120) + "…" : memo.memo}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}
