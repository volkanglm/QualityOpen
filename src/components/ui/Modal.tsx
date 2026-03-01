import { type ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = "460px" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{
                width,
                maxWidth: "calc(100vw - 3rem)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--float-shadow)",
                pointerEvents: "auto",
              }}
            >
              {title && (
                <div
                  className="flex items-center justify-between px-5 py-4 border-b"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <h2
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h2>
                  <Button size="icon" variant="ghost" onClick={onClose} className="h-6 w-6">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="px-5 py-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
