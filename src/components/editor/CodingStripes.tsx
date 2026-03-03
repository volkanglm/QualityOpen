import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Segment, Code } from "@/types";

interface CodingStripesProps {
    segments: Segment[];
    codes: Code[];
    contentLength: number;
    /** Height of the text container in px (for positioning) */
    containerHeight: number;
}

/**
 * Renders thin vertical coding stripes in the left margin.
 * Each stripe is colored by its code and expands on hover to reveal the code name.
 */
export function CodingStripes({
    segments,
    codes,
    contentLength,
    containerHeight,
}: CodingStripesProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const stripes = useMemo(() => {
        if (!contentLength || !containerHeight) return [];

        return segments
            .filter((s) => !s.isHighlight && s.codeIds.length > 0)
            .map((seg) => {
                const firstCode = codes.find((c) => seg.codeIds.includes(c.id));
                const topPct = (seg.start / contentLength) * 100;
                const heightPct = Math.max(0.5, ((seg.end - seg.start) / contentLength) * 100);

                return {
                    id: seg.id,
                    color: firstCode?.color ?? "var(--accent)",
                    codeName: firstCode?.name ?? "Code",
                    topPct,
                    heightPct,
                    codeCount: seg.codeIds.length,
                };
            });
    }, [segments, codes, contentLength, containerHeight]);

    if (stripes.length === 0) return <div className="w-3 flex-shrink-0" />;

    return (
        <div className="w-6 flex-shrink-0 relative select-none" style={{ minHeight: containerHeight }}>
            {stripes.map((stripe) => (
                <motion.div
                    key={stripe.id}
                    className="absolute left-1 cursor-default"
                    style={{
                        top: `${stripe.topPct}%`,
                        height: `${stripe.heightPct}%`,
                        minHeight: 4,
                    }}
                    onMouseEnter={() => setHoveredId(stripe.id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    {/* The stripe line */}
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: stripe.color }}
                        animate={{
                            width: hoveredId === stripe.id ? 20 : 3,
                        }}
                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    />

                    {/* Hover label */}
                    <AnimatePresence>
                        {hoveredId === stripe.id && (
                            <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-6 top-0 z-30 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-medium shadow-lg pointer-events-none"
                                style={{
                                    background: "#18181b",
                                    color: "#fafafa",
                                }}
                            >
                                <span
                                    className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                                    style={{ backgroundColor: stripe.color }}
                                />
                                {stripe.codeName}
                                {stripe.codeCount > 1 && (
                                    <span className="ml-1 opacity-60">+{stripe.codeCount - 1}</span>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
        </div>
    );
}
