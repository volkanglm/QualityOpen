import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Sun, Moon, PanelLeft, PanelRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Tooltip } from "@/components/ui/Tooltip";
import { ExportMenu } from "@/components/layout/ExportMenu";
import { AppLogo } from "@/components/ui/AppLogo";

export function TitleBar() {
  const {
    activeProjectId,
    theme,
    leftCollapsed,
    rightCollapsed,
    toggleTheme,
    toggleLeftPanel,
    toggleRightPanel,
    setCommandPaletteOpen,
  } = useAppStore();

  const { projects } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="drag flex h-9 w-full flex-shrink-0 items-center justify-between px-3 border-b"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* ── Left — App logo + panel toggles ── */}
      <div className="no-drag flex items-center gap-1">
        {/* Logo */}
        <div className="mr-1 flex-shrink-0">
          <AppLogo size={18} variant="mark" />
        </div>

        <TitleBtn
          tooltip={leftCollapsed ? "Show Explorer" : "Hide Explorer"}
          active={!leftCollapsed}
          onClick={toggleLeftPanel}
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </TitleBtn>

        <TitleBtn
          tooltip={rightCollapsed ? "Show Code System" : "Hide Code System"}
          active={!rightCollapsed}
          onClick={toggleRightPanel}
        >
          <PanelRight className="h-3.5 w-3.5" />
        </TitleBtn>
      </div>

      {/* ── Center — Project + doc breadcrumb ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none"
      >
        {activeProject ? (
          <>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: activeProject.color ?? "var(--accent)" }}
            />
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {activeProject.name}
            </span>
          </>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {APP_NAME}
          </span>
        )}
      </div>

      {/* ── Right — Export + ⌘K + Theme + Window controls ── */}
      <div className="no-drag flex items-center gap-0.5">
        {/* Export menu */}
        <ExportMenu />

        <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />

        {/* ⌘K Command Palette trigger */}
        <Tooltip content="Komut Paleti (⌘K)" side="bottom">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-6 items-center gap-1.5 px-2 rounded-[var(--radius-sm)] transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono tracking-tight">⌘K</span>
          </motion.button>
        </Tooltip>

        <div className="w-px h-4 mx-0.5" style={{ background: "var(--border)" }} />

        {/* Theme toggle */}
        <Tooltip content={theme === "dark" ? "Light mode" : "Dark mode"} side="bottom">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={toggleTheme}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <AnimatedThemeIcon dark={theme === "dark"} />
          </motion.button>
        </Tooltip>

        <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

        {/* Window buttons */}
        <WinBtn
          onClick={() => win.minimize()}
          hoverClass="hover-surface"
        >
          <Minus className="h-3 w-3" />
        </WinBtn>
        <WinBtn
          onClick={() => win.toggleMaximize()}
          hoverClass="hover-surface"
        >
          <Square className="h-3 w-3" />
        </WinBtn>
        <WinBtn
          onClick={() => win.close()}
          hoverClass="hover-danger"
        >
          <X className="h-3 w-3" />
        </WinBtn>
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

function TitleBtn({
  children,
  tooltip,
  active,
  onClick,
}: {
  children: React.ReactNode;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
        style={{
          color: active ? "var(--text-primary)" : "var(--text-muted)",
          background: active ? "var(--surface-hover)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        {children}
      </motion.button>
    </Tooltip>
  );
}

function WinBtn({
  children,
  onClick,
  hoverClass,
}: {
  children: React.ReactNode;
  onClick: () => void;
  hoverClass: "hover-surface" | "hover-danger";
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (hoverClass === "hover-danger") {
          el.style.background = "var(--danger-subtle)";
          el.style.color = "var(--danger)";
        } else {
          el.style.background = "var(--surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "transparent";
        el.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </motion.button>
  );
}

function AnimatedThemeIcon({ dark }: { dark: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={dark ? "moon" : "sun"}
        initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </motion.span>
    </AnimatePresence>
  );
}
