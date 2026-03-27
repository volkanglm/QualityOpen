import { useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "@/components/layout/TitleBar";
import { PanelLayout } from "@/components/layout/PanelLayout";
import { SyncStatus } from "@/components/layout/SyncStatus";
import { OfflineBadge } from "@/components/layout/OfflineBadge";
import { PaywallPage } from "@/pages/PaywallPage";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ToastContainer } from "@/components/ui/Toast";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useAuthStore, initAuthListener, initNetworkWatcher } from "@/store/auth.store";
import { useLicenseStore } from "@/store/license.store";
import { useSettingsStore } from "@/store/settings.store";
import { LicenseModal } from "@/components/modals/LicenseModal";
import { SyncConflictDialog } from "@/components/modals/SyncConflictDialog";
import { AppLogo } from "@/components/ui/AppLogo";
import { Upload } from "lucide-react";
import { useSyncStore } from "@/store/sync.store";
import { AiChatPanel } from "@/components/chat/AiChatPanel";
import { ShortcutEngine } from "@/components/keyboard/ShortcutEngine";
import { importFile, getFileCategory } from "@/lib/fileImport";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { AutoUpdater } from "@/components/AutoUpdater";
import { t, useT } from "@/lib/i18n";
import "./index.css";

// ─── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("App crash:", error, info); }
  render() {
    if (this.state.error) {
      const lang = useAppStore.getState().language;
      return (
        <div style={{ position: "fixed", inset: 0, background: "#09090b", color: "#ef4444", fontFamily: "monospace", fontSize: 12, padding: 24, overflow: "auto", zIndex: 99999 }}>
          <p style={{ color: "#fafafa", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>{t("app.renderError", lang)}</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {(this.state.error as Error).message}{"\n\n"}
            {(this.state.error as Error).stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Schedule checker ─────────────────────────────────────────────────────────
const SCHEDULE_CHECK_INTERVAL = 10 * 60 * 1000;

// ─── Splash screen ────────────────────────────────────────────────────────────

function SplashScreen() {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-[9999]"
      style={{ background: "var(--bg-primary)" }}
      onClick={() => useAuthStore.setState({ booting: false, initialized: true })}
    >
      {/* Logo + name */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <AppLogo size={52} variant="badge" />
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          QualityOpen
        </span>
      </motion.div>

      {/* Thin progress bar at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1px] w-full"
        style={{ background: "var(--text-muted)", originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// Shared no-op for unimplemented optional callbacks

export default function App() {
  const t = useT();
  const { theme, commandPaletteOpen, activeProjectId, activeView, isDragOver, setActiveProject } = useAppStore();
  const { accessToken, booting, initialized } = useAuthStore();
  const { checkSchedule } = useSyncStore();
  const { projects, createProject, importBackup } = useProjectStore();

  const handleOpenProjectFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { useToastStore } = await import("@/store/toast.store");

      const selected = await open({
        multiple: false,
        filters: [{ name: "Project Backup", extensions: ["json", "qo"] }],
        title: t("settings.restoreBackup"),
      });

      if (!selected || typeof selected !== "string") return;

      const content = await readTextFile(selected);
      const data = JSON.parse(content);

      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error("Invalid project file");
      }

      importBackup(data);
      useToastStore.getState().push(t("settings.restoreSuccess"), "success");

      // If there's at least one project, activate the first one
      if (data.projects.length > 0) {
        setActiveProject(data.projects[0].id);
      }
    } catch (err) {
      console.error("Failed to open project file:", err);
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(t("settings.restoreError") || "Failed to import project", "error");
    }
  };

  /* Sync theme token to <html> */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    let unsubAuth: () => void = () => { };
    let unsubNetwork: () => void = () => { };

    const setup = async () => {
      console.log("[Boot] Starting initialization sequence...");
      try {
        // Phase 1: Authentication & Settings dependencies
        console.log("[Boot] 1/4: Loading API keys...");
        await useSettingsStore.getState().loadKeys();

        console.log("[Boot] 2/4: Checking license...");
        await useLicenseStore.getState().checkLicense();

        console.log("[Boot] 3/4: Initializing Auth Listener...");
        unsubAuth = initAuthListener();

        console.log("[Boot] 4/4: Initializing Network Watcher...");
        unsubNetwork = initNetworkWatcher();

        console.log("[Boot] Core initialization complete.");
      } catch (err) {
        console.error("[Boot] CRITICAL: Initialization aborted:", err);
        // If init itself crashes, force-complete boot so user sees something (at least error boundaries)
        useAuthStore.setState({ booting: false, initialized: true });
        // Re-throw so the browser/diagnostic listener catches it for the overlay
        throw err;
      }
    };

    setup().catch((e) => {
      console.error("[Boot] Uncaught error in setup():", e);
    });

    // Safety net: if boot is still stuck after 5s, force-complete it
    const safetyTimer = setTimeout(() => {
      const { booting, initialized } = useAuthStore.getState();
      if (booting || !initialized) {
        console.warn("[Safety] Boot stuck after 5s — forcing completion");
        useAuthStore.setState({ booting: false, initialized: true });
      }
    }, 5000);

    return () => {
      clearTimeout(safetyTimer);
      unsubAuth();
      unsubNetwork();
    };
  }, []);

  /* Development Tools: Mock Data & Studio Director */
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const handleDevShortcuts = async (e: KeyboardEvent) => {
      // CMD + SHIFT + M: Load Mock Data
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const { MOCK_PROJECT, MOCK_DOCUMENTS, MOCK_CODES, MOCK_SEGMENTS, MOCK_MEMOS, MOCK_SYNTHESES } = await import("@/dev-tools/mockData");
        useProjectStore.getState().loadDemoProject({
          project: MOCK_PROJECT,
          documents: MOCK_DOCUMENTS,
          codes: MOCK_CODES,
          segments: MOCK_SEGMENTS,
          memos: MOCK_MEMOS,
          syntheses: MOCK_SYNTHESES
        });
        useAppStore.setState({
          activeProjectId: MOCK_PROJECT.id,
          language: "en"
        });
        const { useToastStore } = await import("@/store/toast.store");
        useToastStore.getState().push("Studio Data Loaded (EN)", "success");
      }

      // CMD + SHIFT + P: Run Studio Director
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const { runStudioDirector } = await import("@/dev-tools/studioDirector");
        runStudioDirector();
      }
    };

    window.addEventListener("keydown", handleDevShortcuts);
    return () => window.removeEventListener("keydown", handleDevShortcuts);
  }, []);

  /* Tauri OS drag-and-drop handler (Tauri v2) */
  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    const setup = async () => {
      // If we are in Concept Map, we want native browser D&D to work, 
      // so we avoid Tauri's global listeners which might intercept events.
      if (useAppStore.getState().activeView === "conceptMap") return;

      try {
        const { setIsDragOver } = useAppStore.getState();

        unlistenEnter = await listen("tauri://drag-enter", () => setIsDragOver(true));
        unlistenLeave = await listen("tauri://drag-leave", () => setIsDragOver(false));

        unlistenDrop = await listen<{ paths: string[] }>(
          "tauri://drag-drop",
          async (event) => {
            setIsDragOver(false);
            const paths = event.payload?.paths;
            if (!paths || paths.length === 0) return;

            const { activeProjectId, setActiveDocument, setActiveView } =
              useAppStore.getState();
            if (!activeProjectId) return;

            for (const path of paths) {
              try {
                // Read file via Rust (base64-encoded)
                const b64 = await invoke<string>("read_file_base64", { path });
                const name = path.split(/[/\\]/).pop() ?? path;

                // Determine mime type from extension
                const ext = name.split(".").pop()?.toLowerCase() ?? "";
                const mimeMap: Record<string, string> = {
                  pdf: "application/pdf", txt: "text/plain",
                  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  doc: "application/msword",
                  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
                  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
                  gif: "image/gif", webp: "image/webp",
                };
                const mime = mimeMap[ext] ?? "application/octet-stream";

                // Decode base64 → File
                const raw = atob(b64);
                const ia = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) ia[i] = raw.charCodeAt(i);
                const file = new File([ia], name, { type: mime });

                // Import via existing logic
                const imported = await importFile(file);
                const cat = getFileCategory(file);
                const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";

                const { createDocument, updateDocument } = useProjectStore.getState();
                const newDoc = createDocument(activeProjectId, imported.name || name, docType);
                updateDocument(newDoc.id, {
                  content: imported.content,
                  format: imported.format,
                  wordCount: imported.wordCount,
                });
                setActiveDocument(newDoc.id);
                setActiveView("coding");
              } catch (err) {
                console.error(`Tauri file drop import failed for ${path}:`, err);
              }
            }
          }
        );
      } catch {
        // Not running in Tauri (e.g. browser dev) — no-op
      }
    };

    setup().catch(console.error);
    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, [useAppStore((s) => s.activeView)]);

  /* Scheduled backup check */
  useEffect(() => {
    if (!accessToken) return;
    checkSchedule(accessToken);
    const id = window.setInterval(() => checkSchedule(accessToken), SCHEDULE_CHECK_INTERVAL);
    return () => window.clearInterval(id);
  }, [accessToken, checkSchedule]);

  // ── Gate logic ──────────────────────────────────────────────────────────────
  //
  // booting          → SplashScreen
  // !initialized     → null (prevent flicker)
  // initialized + !user → LoginPage
  // initialized + user  → Main app
  //
  const showMain = initialized && !booting;
  const showPaywall = false;
  const showLoading = !initialized && !booting;

  return (
    <ErrorBoundary>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* ── Splash (covers everything while booting) ── */}
        {booting && <SplashScreen />}

        {/* ── Auth / License gate ── */}
        {showPaywall && <PaywallPage />}
        {showLoading && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
          </div>
        )}
        {showMain && (
          <ErrorBoundary>
            <ShortcutEngine />
            <TitleBar />
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {!activeProjectId ? (
                  <WelcomeScreen
                    key="welcome"
                    onNewProject={() => {
                      const name = `${t("app.newProjectDefault")} ${projects.length + 1}`;
                      const p = createProject(name);
                      setActiveProject(p.id);
                    }}
                    onOpenProject={handleOpenProjectFile}
                  />
                ) : (
                  <motion.div
                    key="panels"
                    className="flex w-full h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PanelLayout />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ErrorBoundary>
        )}

        {/* ── Global overlays (always mounted) ── */}

        {/* Drag over overlay (Tauri v2) */}
        <AnimatePresence>
          {isDragOver && activeView !== "conceptMap" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
            >
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--surface)] p-8 shadow-2xl scale-110 border border-[var(--border)]">
                <div className="rounded-full bg-[var(--accent-subtle)] p-4 text-[var(--accent)]">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t('center.dropLoaded')}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{t('center.fileWillBeAdded')}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync status / account widget — always visible after boot */}
        <AnimatePresence>
          {!booting && initialized && (
            <motion.div
              key="sync"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              <SyncStatus />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline badge — bottom-left, subtle */}
        <OfflineBadge />

        {/* ⌘K Command Palette */}
        <AnimatePresence>
          {commandPaletteOpen && (
            <CommandPalette key="cmd-palette" />
          )}
        </AnimatePresence>

        {/* AI Chat Panel */}
        <AiChatPanel />

        {/* Auto Updater (Silent) */}
        <AutoUpdater />

        {/* Sync Conflict Dialog */}
        <SyncConflictDialog />

        {/* License Modal */}
        <LicenseModal />

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}
