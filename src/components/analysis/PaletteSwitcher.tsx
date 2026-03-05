import { useVisualThemeStore, PALETTES } from "@/store/visualTheme.store";
import { ChevronDown, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n";

// Map palette store IDs to i18n key suffixes
const PALETTE_NAME_KEYS: Record<string, string> = {
    original: "palette.original",
    modern: "palette.modern",
    pastel: "palette.pastel",
    monochrome: "palette.monochrome",
    grayscale: "palette.grayscale",
    midnight: "palette.midnight",
    "high-contrast": "palette.highContrast",
};

export function PaletteSwitcher() {
    const t = useT();
    const { activePaletteId, setPalette } = useVisualThemeStore();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const activePalette = PALETTES.find(p => p.id === activePaletteId) || PALETTES[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center gap-2 px-3 h-9 rounded-xl border transition-all duration-200 hover:shadow-lg",
                    open
                        ? "bg-[var(--accent-subtle)] border-[var(--accent-border)] ring-2 ring-[var(--accent)]/10"
                        : "bg-[var(--bg-tertiary)]/50 border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
            >
                <div className="flex -space-x-1.5">
                    {activePalette.colors.slice(0, 3).map((c, i) => (
                        <div
                            key={i}
                            className="w-3 h-3 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hidden sm:inline">
                    {t((PALETTE_NAME_KEYS[activePalette.id] ?? activePalette.id) as any)}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform", open && "rotate-180")} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                        className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl border bg-[var(--bg-secondary)] shadow-2xl backdrop-blur-xl z-[100]"
                        style={{ borderColor: "var(--border)" }}
                    >
                        <div className="px-3 py-2 border-b border-[var(--border)] mb-1.5 flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5 text-[var(--accent)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t("palette.header")}</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {PALETTES.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setPalette(p.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                                        activePaletteId === p.id
                                            ? "bg-[var(--accent-subtle)]/50"
                                            : "hover:bg-[var(--surface-hover)]"
                                    )}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={cn(
                                            "text-[11px] font-medium transition-colors",
                                            activePaletteId === p.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                                        )}>
                                            {t((PALETTE_NAME_KEYS[p.id] ?? p.id) as any)}
                                        </span>
                                        <div className="flex gap-0.5">
                                            {p.colors.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="w-2.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {activePaletteId === p.id && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
