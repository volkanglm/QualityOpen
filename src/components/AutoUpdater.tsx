import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateStore } from "@/store/update.store";
import { X, Download, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AutoUpdater() {
    const t = useT();
    const { latestVersion, step, progress, dismissed, checkForUpdates, downloadAndInstall, restart, setDismissed } = useUpdateStore();

    useEffect(() => {
        const timer = setTimeout(() => {
            checkForUpdates().catch((e) => {
                console.error("[AutoUpdater] Check failed:", e);
            });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    if (!["available", "downloading", "ready"].includes(step) || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl shadow-[var(--float-shadow)] flex items-center gap-4 z-[9999] min-w-[320px]"
            >
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[var(--text-primary)] text-sm font-bold">
                        {latestVersion ? `${latestVersion} ` : ""}{t("update.available")}
                    </span>

                    {step === "downloading" && (
                        <div className="mt-2 w-full">
                            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                                <span>{t("update.downloading")}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[var(--accent)] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ ease: "linear" }}
                                />
                            </div>
                        </div>
                    )}

                    {step === "ready" && (
                        <span className="text-[var(--text-secondary)] text-xs mt-1">
                            {t("update.readyToRestart")}
                        </span>
                    )}

                    {step === "available" && (
                        <span className="text-[var(--text-secondary)] text-xs mt-0.5">
                            {t("update.subtitle")}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {step === "available" && (
                        <button
                            onClick={() => downloadAndInstall()}
                            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                        >
                            {t("update.now")}
                            <Download className="w-3 h-3" />
                        </button>
                    )}

                    {step === "ready" && (
                        <button
                            onClick={() => restart()}
                            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                        >
                            {t("update.restart")}
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    )}

                    {step !== "downloading" && (
                        <button
                            onClick={() => setDismissed(true)}
                            className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                            title={t("update.close")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
