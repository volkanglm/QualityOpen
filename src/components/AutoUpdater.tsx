import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateStore } from "@/store/update.store";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AutoUpdater() {
    const t = useT();
    const { update, step, progress, dismissed, checkForUpdates, downloadAndInstall, restart, setDismissed } = useUpdateStore();

    useEffect(() => {
        const timer = setTimeout(() => {
            checkForUpdates();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleAction = async () => {
        if (!update) return;

        if (step === "ready") {
            await restart();
            return;
        }

        await downloadAndInstall();
    };

    if ((step === "idle" || step === "checking") || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-[9999]"
            >
                <div className="flex flex-col min-w-[120px]">
                    <span className="text-white text-sm font-bold">v{update?.version} {t("update.available")}</span>
                    <span className="text-zinc-400 text-xs">
                        {step === "downloading" ? t("update.downloading") : step === "ready" ? t("update.ready") : "Bug fixes & performance boosts."}
                    </span>
                </div>

                {step === "downloading" ? (
                    <div className="flex items-center gap-3">
                        <span className="text-white text-xs font-mono">{progress}%</span>
                        <div className="relative w-6 h-6">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-zinc-700"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="text-white transition-all duration-300"
                                    strokeDasharray={`${progress}, 100`}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAction}
                            className={`${step === "ready" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-white hover:bg-zinc-200 text-black"} px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm`}
                        >
                            {step === "ready" ? "Restart" : t("update.now")}
                        </button>
                        {step === "available" && (
                            <button
                                onClick={() => setDismissed(true)}
                                className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                                title={t("update.close")}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
