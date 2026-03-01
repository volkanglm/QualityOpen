import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore, type Toast, type ToastType } from "@/store/toast.store";

// ─── Single toast ─────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
};

// Muted accent per type — only the icon carries the color signal
const ICON_COLORS: Record<ToastType, string> = {
  success: "#6ee7b7",
  error:   "#f87171",
  info:    "#a1a1aa",
};

function ToastItem({ toast }: { toast: Toast }) {
  const { remove } = useToastStore();
  const Icon      = ICONS[toast.type];
  const iconColor = ICON_COLORS[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0  }}
      exit={{    opacity: 0, x: 48,  transition: { duration: 0.15 } }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border cursor-default"
      style={{
        background:  "var(--bg-secondary)",
        borderColor: "var(--border)",
        boxShadow:   "var(--float-shadow)",
        minWidth:    220,
        maxWidth:    360,
        position:    "relative",
        overflow:    "hidden",
      }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: iconColor }} />

      <p
        className="flex-1 text-[12px] font-medium leading-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {toast.message}
      </p>

      <button
        className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: "var(--text-muted)" }}
        onClick={() => remove(toast.id)}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1px]"
        style={{ background: "var(--border-strong)", originX: 0 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div
      className="fixed top-12 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      style={{ position: "fixed" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto" style={{ position: "relative" }}>
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
