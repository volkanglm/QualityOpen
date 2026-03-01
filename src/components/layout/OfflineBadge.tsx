import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

/**
 * Mounted globally in App.tsx.
 * Appears in the bottom-right corner only when offline.
 * Shows a calm tooltip on hover — no alarming colours.
 */
export function OfflineBadge() {
  const { offlineMode } = useAuthStore();
  const [tip, setTip]   = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {offlineMode && (
        <motion.div
          key="offline-badge"
          ref={ref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{    opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="fixed bottom-3 left-3 z-[150]"
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
        >
          {/* Badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] border cursor-default"
            style={{
              background:  "var(--bg-secondary)",
              borderColor: "var(--border)",
              color:       "var(--text-muted)",
            }}
          >
            <WifiOff className="h-3 w-3" />
            <span className="text-[10px] font-medium">Çevrimdışı</span>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {tip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: 4 }}
                transition={{ duration: 0.13, ease: [0.2, 0, 0, 1] }}
                className="absolute bottom-full left-0 mb-2 rounded-[var(--radius-md)] border px-3 py-2"
                style={{
                  background:  "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  boxShadow:   "var(--float-shadow)",
                  width:       260,
                  pointerEvents: "none",
                }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Verileriniz yerel olarak güvende. İnternet bağlantısı sağlandığında otomatik olarak senkronize edilecek.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
