import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import type { Code, Segment } from "@/types";
import { useT } from "@/lib/i18n";

interface TypographicCloudProps {
    codes: Code[];
    segments: Segment[];
    zoom?: number;
}

export const TypographicCloud = memo(({ codes, segments, zoom = 1.0 }: TypographicCloudProps) => {
    const t = useT();
    const codeStats = useMemo(() => {
        return codes
            .map(code => {
                const count = segments.filter(s => s.codeIds.includes(code.id)).length;
                return { ...code, count };
            })
            .filter(c => c.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [codes, segments]);

    const maxCount = Math.max(...codeStats.map(c => c.count), 1);

    const getWeight = (count: number) => {
        const ratio = count / maxCount;
        if (ratio > 0.8) return "font-black";
        if (ratio > 0.6) return "font-extrabold";
        if (ratio > 0.4) return "font-bold";
        if (ratio > 0.2) return "font-semibold";
        return "font-medium";
    };

    const getSize = (count: number) => {
        const ratio = count / maxCount;
        const base = 12 * zoom;
        const extra = ratio * 24 * zoom;
        return `${base + extra}px`;
    };

    const getThemeColor = (count: number) => {
        const ratio = count / maxCount;
        if (ratio > 0.8) return "text-[var(--text-primary)]";
        if (ratio > 0.6) return "text-[var(--text-primary)] opacity-80";
        if (ratio > 0.4) return "text-[var(--text-secondary)]";
        if (ratio > 0.2) return "text-[var(--text-muted)]";
        return "text-[var(--text-disabled)]";
    };

    return (
        <div className="w-full h-full p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {t("analysis.typoCloud")}
                </h3>
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                    {t("analysis.activeCodes").replace("{count}", String(codeStats.length))}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center py-8">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 max-w-2xl text-center">
                    {codeStats.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            className={cn(
                                "cursor-default select-none transition-all hover:scale-105 hover:!text-[var(--text-primary)]",
                                getWeight(item.count),
                                getThemeColor(item.count)
                            )}
                            style={{ fontSize: getSize(item.count) }}
                            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            transition={{
                                delay: idx * 0.03,
                                duration: 0.5,
                                ease: [0.22, 1, 0.36, 1]
                            }}
                            whileHover={{
                                zIndex: 10,
                                transition: { duration: 0.15 }
                            }}
                        >
                            {item.name}
                            <span className="text-[10px] font-mono font-normal opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[var(--text-muted)]">
                                ({item.count})
                            </span>
                        </motion.div>
                    ))}

                    {codeStats.length === 0 && (
                        <div className="text-[11px] text-[var(--text-muted)] italic">
                            {t("analysis.notEnoughCodes")}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-center pt-4 border-t border-[var(--border)]">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    {t("analysis.typoDesc")}
                </p>
            </div>
        </div>
    );
});

const cn = (...args: (string | undefined | boolean)[]) => args.filter(Boolean).join(" ");

TypographicCloud.displayName = "TypographicCloud";
