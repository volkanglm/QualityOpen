import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppState, ViewMode, Theme, Language, PanelWidths, ID, ActiveSelection } from "@/types";

// Default widths in px (for a ~1280px window → 256 / 768 / 256)
const DEFAULT_WIDTHS: PanelWidths = { left: 256, right: 256 };
const MIN_LEFT   = 160;
const MIN_RIGHT  = 160;
const MIN_CENTER = 320;

export const PANEL_LIMITS = { MIN_LEFT, MIN_RIGHT, MIN_CENTER };

interface AppStore extends AppState {
  // Navigation
  setActiveProject:  (id: ID | null)    => void;
  setActiveDocument: (id: ID | null)    => void;
  setActiveView:     (view: ViewMode)   => void;

  // Theme
  setTheme:          (t: Theme)         => void;
  toggleTheme:       ()                 => void;

  // Language
  setLanguage:       (l: Language)      => void;

  // Panels
  setPanelWidths:    (w: PanelWidths)   => void;
  setLeftWidth:      (w: number)        => void;
  setRightWidth:     (w: number)        => void;
  toggleLeftPanel:   ()                 => void;
  toggleRightPanel:  ()                 => void;

  // AI / Command palette
  setActiveSelection:    (s: ActiveSelection | null) => void;
  setCommandPaletteOpen: (open: boolean)             => void;
  // Retrieval / search / chat
  setActiveCodeFilter:   (id: ID | null)             => void;
  setChatOpen:           (open: boolean)             => void;
  setSearchQuery:        (q: string)                 => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── initial state ──
      activeProjectId:    null,
      activeDocumentId:   null,
      activeView:         "documents",
      theme:              "dark",
      language:           "tr",
      panelWidths:        DEFAULT_WIDTHS,
      leftCollapsed:      false,
      rightCollapsed:     false,
      activeSelection:    null,
      commandPaletteOpen: false,
      activeCodeFilter:   null,
      chatOpen:           false,
      searchQuery:        "",

      // ── navigation ──
      setActiveProject:  (id)   => set({ activeProjectId: id, activeDocumentId: null }),
      setActiveDocument: (id)   => set({ activeDocumentId: id }),
      setActiveView:     (view) => set({ activeView: view }),

      // ── theme ──
      setTheme: (t) => {
        document.documentElement.setAttribute("data-theme", t);
        set({ theme: t });
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        set({ theme: next });
      },

      // ── language ──
      setLanguage: (l) => set({ language: l }),

      // ── panels ──
      setPanelWidths: (w) => set({ panelWidths: w }),
      setLeftWidth:   (w) => set((s) => ({ panelWidths: { ...s.panelWidths, left:  Math.max(w, MIN_LEFT)  } })),
      setRightWidth:  (w) => set((s) => ({ panelWidths: { ...s.panelWidths, right: Math.max(w, MIN_RIGHT) } })),
      toggleLeftPanel:  () => set((s) => ({ leftCollapsed:  !s.leftCollapsed  })),
      toggleRightPanel: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),

      setActiveSelection:    (s)    => set({ activeSelection: s }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setActiveCodeFilter:   (id)   => set({ activeCodeFilter: id }),
      setChatOpen:           (open) => set({ chatOpen: open }),
      setSearchQuery:        (q)    => set({ searchQuery: q }),
    }),
    {
      name: "qo-app-state",
      // Don't persist transient UI state
      partialize: (s) => ({
        activeProjectId:  s.activeProjectId,
        activeDocumentId: s.activeDocumentId,
        activeView:       s.activeView,
        theme:            s.theme,
        language:         s.language,
        panelWidths:      s.panelWidths,
        leftCollapsed:    s.leftCollapsed,
        rightCollapsed:   s.rightCollapsed,
      }),
      // Reapply theme on hydration
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    }
  )
);
