import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, X } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AutoUpdater() {
    const t = useT();
    const [update, setUpdate] = useState<Update | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Wait a few seconds after app start to calmly check for updates
        const timer = setTimeout(() => {
            check().then((res) => {
                if (res?.available) {
                    setUpdate(res);
                }
            }).catch((e) => console.error("Silently failed to check updates:", e));
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleUpdate = async () => {
        if (!update) return;
        setDownloading(true);
        let contentLength = 0;
        let downloaded = 0;

        try {
            await update.downloadAndInstall((e) => {
                switch (e.event) {
                    case "Started":
                        contentLength = e.data.contentLength ?? 0;
                        break;
                    case "Progress":
                        downloaded += e.data.chunkLength;
                        if (contentLength > 0) {
                            setProgress(Math.round((downloaded / contentLength) * 100));
                        }
                        break;
                    case "Finished":
                        setProgress(100);
                        break;
                }
            });
            await relaunch();
        } catch (err) {
            console.error("Update failed:", err);
            setDownloading(false);
            setDismissed(true); // Hide on error to not block UI
        }
    };

    if (!update || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 z-[9999] w-80 rounded-[var(--radius-lg)] border p-4"
                style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
                }}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                            <Download className="h-4 w-4" />
                        </div>
                        <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
                            {t("update.ready")}
                        </h3>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        disabled={downloading}
                        className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none"
                        style={{ color: "var(--text-muted)" }}
                        title={t("update.close")}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="mb-4 text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <strong className="text-blue-400 font-medium">v{update.version}</strong> {t("update.available")}
                </p>

                {downloading ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                            <span>{t("update.downloading")}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.2, ease: "linear" }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 font-medium">
                        <button
                            onClick={() => void handleUpdate()}
                            className="flex-1 rounded-md px-3 py-2 text-[12px] text-white transition-all bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-900/20"
                        >
                            {t("update.now")}
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="rounded-md px-3 py-2 text-[12px] transition-colors hover:bg-white/5"
                            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                        >
                            {t("update.later")}
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
