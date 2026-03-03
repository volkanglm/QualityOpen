import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Segment, Code } from "@/types";

interface StripeItem {
    id: string;
    color: string;
    codeName: string;
    codeCount: number;
    /** Segment character start ratio (0–1) */
    startRatio: number;
    /** Segment character end ratio (0–1) */
    endRatio: number;
}

interface CodingStripesProps {
    segments: Segment[];
    codes: Code[];
    contentLength: number;
    /** Height of the text container in px (for positioning) */
    containerHeight: number;
    /**
     * Optional ref to the scrollable text container.
     * When provided the component will use getBoundingClientRect()
     * to compute pixel-precise positions.
     */
    containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Renders thin vertical coding stripes in the left margin.
 * Each stripe is colored by its code and expands on hover to reveal the code name.
 *
 * Position calculation:
 *   - When `containerRef` is present, uses `getBoundingClientRect()` on the
 *     wrapper element plus the character ratio to compute an absolute top offset
 *     that is immune to line-height / <p>-margin drift.
 *   - Falls back to percentage-of-containerHeight when no ref is given.
 */
export function CodingStripes({
    segments,
    codes,
    contentLength,
    containerHeight,
    containerRef,
}: CodingStripesProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const selfRef = useRef<HTMLDivElement>(null);
    /** Resolved container top relative to the stripe wrapper (px) */
    const [resolvedTop, setResolvedTop] = useState(0);
    /** Resolved total container height for pixel mapping */
    const [resolvedHeight, setResolvedHeight] = useState(containerHeight);

    /** Recalculate whenever the container scrolls / resizes */
    useLayoutEffect(() => {
        function update() {
            if (!containerRef?.current || !selfRef.current) {
                setResolvedTop(0);
                setResolvedHeight(containerHeight);
                return;
            }
            const parentRect = selfRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            setResolvedTop(containerRect.top - parentRect.top);
            setResolvedHeight(containerRef.current.scrollHeight);
        }
        update();
        const obs = new ResizeObserver(update);
        if (containerRef?.current) obs.observe(containerRef.current);
        if (selfRef.current) obs.observe(selfRef.current);
        return () => obs.disconnect();
    }, [containerRef, containerHeight]);

    const stripes: StripeItem[] = useMemo(() => {
        if (!contentLength) return [];
        return segments
            .filter((s) => !s.isHighlight && s.codeIds.length > 0)
            .map((seg) => {
                const firstCode = codes.find((c) => seg.codeIds.includes(c.id));
                return {
                    id: seg.id,
                    color: firstCode?.color ?? "var(--accent)",
                    codeName: firstCode?.name ?? "Code",
                    codeCount: seg.codeIds.length,
                    startRatio: seg.start / contentLength,
                    endRatio: seg.end / contentLength,
                };
            });
    }, [segments, codes, contentLength]);

    if (stripes.length === 0) return <div className="w-3 flex-shrink-0" />;

    return (
        <div
            ref={selfRef}
            className="w-6 flex-shrink-0 relative select-none"
            style={{ minHeight: containerHeight }}
        >
            {stripes.map((stripe) => {
                /** Map character ratio → absolute pixel position inside this div */
                const topPx = resolvedTop + stripe.startRatio * resolvedHeight;
                const heightPx = Math.max(4, (stripe.endRatio - stripe.startRatio) * resolvedHeight);

                return (
                    <motion.div
                        key={stripe.id}
                        className="absolute left-1 cursor-default"
                        style={{
                            top: topPx,
                            height: heightPx,
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
                );
            })}
        </div>
    );
}
