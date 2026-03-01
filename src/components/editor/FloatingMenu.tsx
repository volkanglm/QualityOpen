import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Sparkles, Highlighter, AlignLeft } from "lucide-react";
import { useT } from "@/hooks/useT";

export interface FloatingMenuPos {
  /** viewport-relative X center of the selection */
  centerX: number;
  /** viewport-relative top of the selection */
  topY: number;
  text: string;
  start: number;
  end: number;
}

interface FloatingMenuProps {
  pos:          FloatingMenuPos | null;
  onAssignCode: (pos: FloatingMenuPos) => void;
  onAskAI:      (pos: FloatingMenuPos) => void;
  onHighlight:  (pos: FloatingMenuPos) => void;
  onSummarize:  (pos: FloatingMenuPos) => void;
  onDismiss:    () => void;
}

const MENU_HEIGHT = 44;
const MENU_WIDTH  = 270;
const GAP         = 10;

const ACTION_IDS = [
  { id: "code",      icon: Tag,        color: "var(--accent)" },
  { id: "highlight", icon: Highlighter, color: "var(--code-5)" },
  { id: "summarize", icon: AlignLeft,  color: "var(--code-8)" },
  { id: "ai",        icon: Sparkles,   color: "var(--code-3)" },
] as const;

export function FloatingMenu({
  pos,
  onAssignCode,
  onAskAI,
  onHighlight,
  onSummarize,
  onDismiss,
}: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const ACTIONS = [
    { ...ACTION_IDS[0], label: t("float.assign")    },
    { ...ACTION_IDS[1], label: t("float.highlight") },
    { ...ACTION_IDS[2], label: t("float.summarize") },
    { ...ACTION_IDS[3], label: t("float.askAi")     },
  ];

  /* Close on outside click */
  useEffect(() => {
    if (!pos) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    const t = setTimeout(() => window.addEventListener("mousedown", handler), 80);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", handler);
    };
  }, [pos, onDismiss]);

  const getStyle = (): React.CSSProperties => {
    if (!pos) return {};
    const vw  = window.innerWidth;
    let left  = pos.centerX - MENU_WIDTH / 2;
    left      = Math.max(8, Math.min(left, vw - MENU_WIDTH - 8));
    const top = pos.topY - MENU_HEIGHT - GAP;
    return {
      position: "fixed",
      top:      Math.max(8, top),
      left,
      zIndex:   200,
      width:    MENU_WIDTH,
    };
  };

  const handle = (action: typeof ACTION_IDS[number]["id"]) => {
    if (!pos) return;
    onDismiss();
    setTimeout(() => {
      if (action === "code")      onAssignCode(pos);
      else if (action === "ai")   onAskAI(pos);
      else if (action === "highlight") onHighlight(pos);
      else if (action === "summarize") onSummarize(pos);
    }, 0);
  };

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          ref={menuRef}
          key="float-menu"
          initial={{ opacity: 0, y: 8, scale: 0.93 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          style={getStyle()}
        >
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-[5px]"
            style={{
              width:       0,
              height:      0,
              borderLeft:  "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop:   "5px solid var(--bg-secondary)",
            }}
          />

          {/* Menu body */}
          <div
            className="flex items-center rounded-[var(--radius-md)] border overflow-hidden"
            style={{
              background:  "var(--bg-secondary)",
              borderColor: "var(--border)",
              boxShadow:   "var(--float-shadow)",
            }}
          >
            {ACTIONS.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  whileHover={{ background: "var(--surface-hover)" }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handle(action.id)}
                  className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5 transition-colors"
                  style={{
                    borderRight:
                      idx < ACTIONS.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: action.color }} />
                  <span
                    className="text-[10px] font-medium whitespace-nowrap"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
