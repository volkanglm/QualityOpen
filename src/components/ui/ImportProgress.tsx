import { motion } from "framer-motion";

interface ImportProgressProps {
    fileName?: string;
    /** 0-100 for progress bar mode, or undefined for indeterminate spinner */
    progress?: number;
}

/**
 * Minimalist Swiss-style import progress indicator.
 * Shows an animated spinner or a progress bar with the file name.
 */
export function ImportProgress({ fileName, progress }: ImportProgressProps) {
    const isIndeterminate = progress === undefined;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border)",
                boxShadow: "var(--float-shadow)",
            }}
        >
            {/* Spinner or progress ring */}
            {isIndeterminate ? (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 rounded-full border-2 border-t-transparent flex-shrink-0"
                    style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }}
                />
            ) : (
                <div className="relative h-4 w-4 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="h-4 w-4 -rotate-90">
                        <circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth="3"
                        />
                        <motion.circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={100}
                            animate={{ strokeDashoffset: 100 - progress }}
                            transition={{ duration: 0.3 }}
                        />
                    </svg>
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {fileName ? `İçe aktarılıyor: ${fileName}` : "Dosya işleniyor…"}
                </p>

                {/* Progress bar (determinate mode only) */}
                {!isIndeterminate && (
                    <div
                        className="mt-1.5 h-1 rounded-full overflow-hidden"
                        style={{ background: "var(--border)" }}
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: "var(--accent)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                )}
            </div>

            {!isIndeterminate && (
                <span
                    className="text-[10px] tabular-nums flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                >
                    {Math.round(progress)}%
                </span>
            )}
        </motion.div>
    );
}
