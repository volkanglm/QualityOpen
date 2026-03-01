import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "right", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positions = {
    right:  "left-full ml-2 top-1/2 -translate-y-1/2",
    left:   "right-full mr-2 top-1/2 -translate-y-1/2",
    top:    "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.90 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.90 }}
            transition={{ duration: 0.10, ease: "easeOut" }}
            className={cn(
              "absolute z-50 whitespace-nowrap rounded-[var(--radius-xs)] px-2 py-1 text-[11px] pointer-events-none shadow-md",
              positions[side]
            )}
            style={{
              background:   "var(--surface-active)",
              color:        "var(--text-secondary)",
              border:       "1px solid var(--border)",
              boxShadow:    "var(--float-shadow)",
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
