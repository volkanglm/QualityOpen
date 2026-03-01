import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, PANEL_LIMITS } from "@/store/app.store";
import { PanelResizer } from "./PanelResizer";
import { LeftPanel } from "@/components/panels/LeftPanel";
import { CenterPanel } from "@/components/panels/CenterPanel";
import { RightPanel } from "@/components/panels/RightPanel";

const COLLAPSE_ANIM = { type: "spring" as const, stiffness: 340, damping: 34 };

export function PanelLayout() {
  const {
    panelWidths,
    leftCollapsed,
    rightCollapsed,
    setLeftWidth,
    setRightWidth,
  } = useAppStore();

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Maximum the left panel can grow = total width − minCenter − right panel width
   */
  const getMaxLeft = () => {
    const total = containerRef.current?.clientWidth ?? 1280;
    return total - PANEL_LIMITS.MIN_CENTER - panelWidths.right;
  };

  const getMaxRight = () => {
    const total = containerRef.current?.clientWidth ?? 1280;
    return total - PANEL_LIMITS.MIN_CENTER - panelWidths.left;
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
    >
      {/* ─── Left Panel ──────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!leftCollapsed && (
          <motion.aside
            key="left"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidths.left, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={COLLAPSE_ANIM}
            className="flex-shrink-0 overflow-hidden"
            style={{
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              minWidth: leftCollapsed ? 0 : PANEL_LIMITS.MIN_LEFT,
            }}
          >
            <LeftPanel />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Resizer — Left | Center */}
      {!leftCollapsed && (
        <PanelResizer
          value={panelWidths.left}
          onChange={setLeftWidth}
          max={getMaxLeft()}
          direction="right"
        />
      )}

      {/* ─── Center Panel ────────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-hidden"
        style={{ minWidth: PANEL_LIMITS.MIN_CENTER }}
      >
        <CenterPanel />
      </main>

      {/* Resizer — Center | Right */}
      {!rightCollapsed && (
        <PanelResizer
          value={panelWidths.right}
          onChange={setRightWidth}
          max={getMaxRight()}
          direction="left"
        />
      )}

      {/* ─── Right Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!rightCollapsed && (
          <motion.aside
            key="right"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidths.right, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={COLLAPSE_ANIM}
            className="flex-shrink-0 overflow-hidden"
            style={{
              borderLeft: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              minWidth: rightCollapsed ? 0 : PANEL_LIMITS.MIN_RIGHT,
            }}
          >
            <RightPanel />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
