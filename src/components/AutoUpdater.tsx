import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateStore } from "@/store/update.store";
import { X, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AutoUpdater() {
    const t = useT();
    const { latestVersion, step, dismissed, checkForUpdates, openReleasePage, setDismissed } = useUpdateStore();

    useEffect(() => {
        const timer = setTimeout(() => {
            checkForUpdates().catch((e) => {
                console.error("[AutoUpdater] Check failed:", e);
            });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    if ((step === "idle" || step === "checking") || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl shadow-[var(--float-shadow)] flex items-center gap-4 z-[9999]"
            >
                <div className="flex flex-col min-w-[120px]">
                    <span className="text-[var(--text-primary)] text-sm font-bold">
                        {latestVersion ? `${latestVersion} ` : ""}{t("update.available")}
                    </span>
                    <span className="text-[var(--text-secondary)] text-xs">
                        Bug fixes & performance boosts.
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => openReleasePage()}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                    >
                        {t("update.now")}
                        <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        title={t("update.close")}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
