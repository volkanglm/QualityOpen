import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Settings,
  Sun,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search, Key, LayoutGrid, FileText, MessageSquare
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useSettingsStore } from "@/store/settings.store";
import { analyzeThematicCodes } from "@/lib/ai";
import { CODE_COLORS } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaletteState = "idle" | "loading" | "success" | "error";

interface Command {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  category: string;
  disabled?: boolean;
  disabledReason?: string;
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function AiSkeletonLoader() {
  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </div>

        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Analiz ediliyor
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Tematik kodlar çıkarılıyor…
          </p>
        </div>
      </div>

      {/* Skeleton text lines */}
      <div className="space-y-2.5">
        {[78, 55, 68, 42, 62, 50].map((w, i) => (
          <div
            key={i}
            className="skeleton-shimmer rounded-[var(--radius-xs)]"
            style={{ height: "10px", width: `${w}%` }}
          />
        ))}
      </div>

      {/* Skeleton chips */}
      <div
        className="flex gap-2 mt-4 pt-3 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {[72, 88, 64].map((w, i) => (
          <div
            key={i}
            className="skeleton-shimmer rounded-[var(--radius-xs)]"
            style={{ height: "22px", width: `${w}px` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function SuccessState({ codes }: { codes: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 flex flex-col items-center gap-3 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: 0.05 }}
        style={{ color: "var(--code-2)" }}
      >
        <CheckCircle2 className="h-8 w-8" />
      </motion.div>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {codes.length} kod atandı
      </p>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {codes.map((name, i) => {
          const color = CODE_COLORS[i % CODE_COLORS.length];
          return (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
            >
              {name}
            </motion.span>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const {
    activeSelection,
    activeProjectId,
    theme,
    toggleTheme,
    setActiveView,
    setCommandPaletteOpen,
    setChatOpen,
    setActiveDocument,
  } = useAppStore();

  const { codes, documents, createCode, addSegment } = useProjectStore();
  const { getActiveKey, getProvider } = useSettingsStore();

  const [query, setQuery] = useState("");
  const [paletteState, setPaletteState] = useState<PaletteState>("idle");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState("");
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const hasSelection = !!activeSelection?.text;
  const hasApiKey = !!getActiveKey();
  const provider = getProvider();

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setQuery("");
    setPaletteState("idle");
    setError("");
  }, [setCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  // Build command list
  const docCommands: Command[] = documents
    .filter((d) => d.projectId === activeProjectId)
    .map((d) => ({
      id: `doc-${d.id}`,
      icon: <FileText className="h-3.5 w-3.5" />,
      label: d.name,
      description: "Belgeye git",
      category: "Belgeler",
    }));

  const allCommands: Command[] = [
    ...docCommands,
    {
      id: "thematic-code",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: "Tematik Olarak Kodla",
      description: hasSelection
        ? `"${activeSelection.text.slice(0, 48)}${activeSelection.text.length > 48 ? "…" : ""}"`
        : "Önce bir metin seçin",
      badge: provider ?? "AI",
      category: "AI",
      disabled: !hasSelection || !hasApiKey,
      disabledReason: !hasApiKey
        ? "API anahtarı yok — Ayarlar'dan ekleyin"
        : !hasSelection
          ? "Önce belgeden metin seçin"
          : undefined,
    },
    {
      id: "open-api-settings",
      icon: <Key className="h-3.5 w-3.5" />,
      label: "API Ayarları",
      description: hasApiKey
        ? `${provider === "anthropic" ? "Anthropic" : "OpenAI"} anahtarı aktif`
        : "OpenAI veya Anthropic anahtarı ekle",
      category: "Ayarlar",
    },
    {
      id: "open-settings",
      icon: <Settings className="h-3.5 w-3.5" />,
      label: "Ayarlar",
      description: "Uygulama tercihlerini yönet",
      category: "Ayarlar",
    },
    {
      id: "toggle-theme",
      icon: <Sun className="h-3.5 w-3.5" />,
      label: "Temayı Değiştir",
      description: theme === "dark" ? "Light moda geç" : "Dark moda geç",
      category: "Görünüm",
    },
    {
      id: "new-code",
      icon: <Tag className="h-3.5 w-3.5" />,
      label: "Yeni Kod",
      description: "Kod sistemine yeni bir kod ekle",
      category: "Kodlama",
      disabled: !activeProjectId,
    },
    {
      id: "open-dashboard",
      icon: <LayoutGrid className="h-3.5 w-3.5" />,
      label: "Dashboard'u Aç",
      description: "Proje analiz panosuna git",
      category: "Görünüm",
      disabled: !activeProjectId,
    },
    {
      id: "open-documents",
      icon: <FileText className="h-3.5 w-3.5" />,
      label: "Belgeler",
      description: "Tüm belgeler listesine dön",
      category: "Görünüm",
      disabled: !activeProjectId,
    },
    {
      id: "open-chat",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      label: "AI Chat Aç",
      description: "Yapay zeka asistanını başlat",
      category: "AI",
      disabled: !activeProjectId,
    },
  ];

  const filtered = allCommands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIdx];
        if (cmd && !cmd.disabled) executeCommand(cmd.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedIdx, close]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIdx(0); }, [query]);

  // ── Execute ──
  const executeCommand = async (id: string) => {
    if (id === "toggle-theme") { toggleTheme(); close(); return; }

    if (id === "open-settings" || id === "open-api-settings") {
      setActiveView("settings");
      close();
      return;
    }

    if (id === "new-code") {
      setActiveView("coding");
      close();
      return;
    }

    if (id === "open-dashboard") { setActiveView("dashboard"); close(); return; }
    if (id === "open-documents") { setActiveView("documents"); close(); return; }
    if (id === "open-chat") { setChatOpen(true); close(); return; }

    if (id.startsWith("doc-")) {
      const docId = id.replace("doc-", "");
      setActiveDocument(docId);
      setActiveView("coding");
      close();
      return;
    }

    if (id === "thematic-code") {
      if (!activeSelection || !activeProjectId) return;
      const key = getActiveKey();
      if (!key) return;

      setPaletteState("loading");
      setError("");

      try {
        const result = await analyzeThematicCodes(key, activeSelection.text);

        // Create codes that don't exist yet; collect all codeIds
        const existingCodes = codes.filter((c) => c.projectId === activeProjectId);
        const codeIds: string[] = [];

        for (const suggested of result.codes ?? []) {
          const existing = existingCodes.find(
            (c) => c.name.toLowerCase() === suggested.name.toLowerCase()
          );
          if (existing) {
            codeIds.push(existing.id);
          } else {
            const newCode = createCode(activeProjectId, suggested.name);
            codeIds.push(newCode.id);
          }
        }

        // Add segment with all codes assigned
        addSegment({
          documentId: activeSelection.documentId,
          projectId: activeProjectId,
          start: activeSelection.start,
          end: activeSelection.end,
          text: activeSelection.text,
          codeIds,
        });

        setAppliedCodes((result.codes ?? []).map((c) => c.name));
        setPaletteState("success");
        setTimeout(close, 2200);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
        setPaletteState("error");
      }
    }
  };

  // Group commands by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="cmd-backdrop fixed inset-0 z-[500] flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-[520px] rounded-[var(--radius-lg)] border overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
          boxShadow: "var(--float-shadow)",
        }}
      >
        {/* ── Search input ── */}
        {paletteState === "idle" && (
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Komut ara…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                color: "var(--text-muted)",
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              ESC
            </kbd>
          </div>
        )}

        {/* ── Context indicator (selection) ── */}
        {paletteState === "idle" && hasSelection && (
          <div
            className="px-4 py-2 border-b flex items-center gap-2"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--surface)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-[var(--radius-xs)] flex-shrink-0"
              style={{ background: "var(--text-muted)" }}
            />
            <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
              Seçili: "{activeSelection.text.slice(0, 60)}{activeSelection.text.length > 60 ? "…" : ""}"
            </p>
          </div>
        )}

        {/* ── Command list ── */}
        {paletteState === "idle" && (
          <div className="max-h-[320px] overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <p className="text-center text-xs py-8" style={{ color: "var(--text-muted)" }}>
                Komut bulunamadı
              </p>
            ) : (
              Object.entries(grouped).map(([category, cmds]) => (
                <div key={category} className="mb-1">
                  <p
                    className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--text-disabled)" }}
                  >
                    {category}
                  </p>
                  {cmds.map((cmd) => {
                    const globalIdx = filtered.indexOf(cmd);
                    const isSelected = globalIdx === selectedIdx;

                    return (
                      <motion.button
                        key={cmd.id}
                        whileTap={{ scale: 0.98 }}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        onClick={() => !cmd.disabled && executeCommand(cmd.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{
                          background: isSelected ? "var(--surface-hover)" : "transparent",
                          opacity: cmd.disabled ? 0.45 : 1,
                          cursor: cmd.disabled ? "not-allowed" : "pointer",
                        }}
                      >
                        {/* Icon */}
                        <span
                          className="h-7 w-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected ? "var(--surface-active)" : "var(--surface)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {cmd.icon}
                        </span>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {cmd.label}
                            </span>
                            {cmd.badge && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-xs)] font-medium uppercase"
                                style={{
                                  background: "var(--surface)",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {cmd.disabled && cmd.disabledReason ? cmd.disabledReason : cmd.description}
                          </p>
                        </div>

                        {/* Enter hint */}
                        {isSelected && !cmd.disabled && (
                          <kbd
                            className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0"
                            style={{
                              color: "var(--text-muted)",
                              background: "var(--surface)",
                              borderColor: "var(--border)",
                            }}
                          >
                            ↵
                          </kbd>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── AI Skeleton loader ── */}
        {paletteState === "loading" && <AiSkeletonLoader />}

        {/* ── Success state ── */}
        {paletteState === "success" && <SuccessState codes={appliedCodes} />}

        {/* ── Error state ── */}
        {paletteState === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 flex flex-col items-center gap-3 text-center"
          >
            <AlertCircle className="h-7 w-7" style={{ color: "var(--danger)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              İstek Başarısız
            </p>
            <p
              className="text-[11px] leading-relaxed max-w-[360px]"
              style={{ color: "var(--text-muted)" }}
            >
              {error}
            </p>
            <button
              onClick={() => setPaletteState("idle")}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-secondary)",
              }}
            >
              Geri dön
            </button>
          </motion.div>
        )}

        {/* ── Footer ── */}
        {paletteState === "idle" && (
          <div
            className="flex items-center justify-between px-4 py-2 border-t"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-tertiary)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                <kbd className="font-mono">↑↓</kbd> Gezin
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                <kbd className="font-mono">↵</kbd> Çalıştır
              </span>
            </div>
            {hasApiKey ? (
              <span
                className="text-[10px] flex items-center gap-1"
                style={{ color: "var(--code-2)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {provider === "anthropic" ? "Anthropic" : "OpenAI"} bağlı
              </span>
            ) : (
              <span className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                API anahtarı yok
              </span>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
