import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CloudDownload, Upload } from "lucide-react";
import { useSyncStore } from "@/store/sync.store";
import { useT } from "@/hooks/useT";

export function SyncConflictDialog() {
  const { conflictPending, resolveConflict } = useSyncStore();
  const t = useT();
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  // Focus first button when dialog opens
  useEffect(() => {
    if (conflictPending) {
      setTimeout(() => firstBtnRef.current?.focus(), 50);
    }
  }, [conflictPending]);

  return (
    <AnimatePresence>
      {conflictPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-title"
            onKeyDown={(e) => { if (e.key === "Escape") resolveConflict("overwrite"); }}
            className="w-[380px] rounded-xl border shadow-2xl p-6 flex flex-col gap-4"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2" style={{ background: "var(--warning-subtle, #fef3c7)" }}>
                <AlertTriangle className="h-5 w-5" style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <h2 id="conflict-title" className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("sync.conflictTitle")}
                </h2>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {t("sync.conflictDesc")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                ref={firstBtnRef}
                onClick={() => resolveConflict("overwrite")}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border text-left transition-colors hover:opacity-80"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <Upload className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <div>
                  <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {t("sync.conflictOverwrite")}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t("sync.conflictOverwriteHint")}
                  </p>
                </div>
              </button>

              <button
                onClick={() => resolveConflict("download")}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border text-left transition-colors hover:opacity-80"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <CloudDownload className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <div>
                  <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {t("sync.conflictDownload")}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t("sync.conflictDownloadHint")}
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
