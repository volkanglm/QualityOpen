import { useState, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { Settings, Key, Eye, EyeOff, Check, Trash2, Info, Cpu, Globe, Download, Upload, Database, RefreshCw } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useAuthStore } from "@/store/auth.store";
import { useSettingsStore, type DefaultProvider } from "@/store/settings.store";
import { Button } from "@/components/ui/Button";
import { useT } from "@/hooks/useT";
import { SyncManager } from "@/components/sync/SyncManager";
import { FolderOpen } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
};

// ─── API Key Input Row ────────────────────────────────────────────────────────

function ApiKeyInput({
  label,
  provider,
  placeholder,
  value,
  onSave,
  onClear,
}: {
  label: string;
  provider: "OpenAI" | "Anthropic" | "Gemini";
  placeholder: string;
  value: string;
  onSave: (k: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = useT();

  const providerColor =
    provider === "Anthropic" ? "#c4b5fd" :
      provider === "Gemini" ? "#6ee7b7" :
        "#86efac";
  const hasKey = !!value;

  const handleSave = () => {
    if (!draft.trim()) return;
    onSave(draft.trim());
    setDraft("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              background: `${providerColor}18`,
              color: providerColor,
              border: `1px solid ${providerColor}30`,
            }}
          >
            {provider}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {label}
          </span>
        </div>

        {hasKey && (
          <div className="flex items-center gap-1">
            <span
              className="text-[10px] flex items-center gap-1"
              style={{ color: "var(--code-2)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t("common.active")}
            </span>
            <button
              onClick={onClear}
              className="ml-2 p-1 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              title="Anahtarı sil"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Current key preview */}
      {hasKey && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-[11px] font-mono"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <Key className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          {value.slice(0, 8)}{"•".repeat(20)}{value.slice(-4)}
        </div>
      )}

      {/* Input new key */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full h-8 rounded-[var(--radius-sm)] border px-3 pr-8 text-xs font-mono outline-none"
            style={{
              background: "var(--bg-tertiary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            {visible
              ? <EyeOff className="h-3.5 w-3.5" />
              : <Eye className="h-3.5 w-3.5" />
            }
          </button>
        </div>
        <Button
          size="sm"
          variant={saved ? "primary" : "outline"}
          className="h-8 gap-1 text-[11px] flex-shrink-0"
          onClick={handleSave}
          disabled={!draft.trim()}
        >
          {saved ? <Check className="h-3 w-3" /> : null}
          {saved ? t("settings.saved") : t("settings.save")}
        </Button>
      </div>

      <p className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
        {t("settings.keyHint")}
      </p>
    </div>
  );
}

// ─── Segmented control helper ─────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border p-0.5"
      style={{ borderColor: "var(--border)" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="rounded-[4px] px-2.5 py-1 text-xs transition-all"
          style={
            value === opt.value
              ? { background: "var(--accent)", color: "var(--bg-primary)" }
              : { color: "var(--text-muted)" }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { theme, setTheme, language, setLanguage } = useAppStore();
  const { projects, documents, codes, segments, memos, importBackup } = useProjectStore();
  const { accessToken, localFolderPath } = useAuthStore();
  const {
    getOpenAIKey,
    getAnthropicKey,
    getGeminiKey,
    getProvider,
    defaultProvider,
    setOpenAIKey,
    setAnthropicKey,
    setGeminiKey,
    setDefaultProvider,
    clearKeys,
  } = useSettingsStore();

  const t = useT();
  const provider = getProvider();
  const hasAnyKey = !!(getOpenAIKey() || getAnthropicKey() || getGeminiKey());

  const importRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  const [syncManagerOpen, setSyncManagerOpen] = useState(false);

  const handleExport = () => {
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      projects,
      documents,
      codes,
      segments,
      memos,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QualityOpen_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as {
        version?: string;
        projects?: unknown[];
        documents?: unknown[];
        codes?: unknown[];
        segments?: unknown[];
        memos?: unknown[];
      };
      if (!payload.projects || !payload.documents || !payload.codes) {
        throw new Error("Geçersiz yedek dosyası");
      }
      importBackup({
        projects: payload.projects as Parameters<typeof importBackup>[0]["projects"],
        documents: payload.documents as Parameters<typeof importBackup>[0]["documents"],
        codes: payload.codes as Parameters<typeof importBackup>[0]["codes"],
        segments: (payload.segments ?? []) as Parameters<typeof importBackup>[0]["segments"],
        memos: (payload.memos ?? []) as Parameters<typeof importBackup>[0]["memos"],
      });
      setImportStatus("success");
      setTimeout(() => setImportStatus("idle"), 3000);
    } catch {
      setImportStatus("error");
      setTimeout(() => setImportStatus("idle"), 3000);
    }
    if (importRef.current) importRef.current.value = "";
  };
  const configuredProviders = [
    getAnthropicKey() && "anthropic",
    getGeminiKey() && "gemini",
    getOpenAIKey() && "openai",
  ].filter(Boolean) as string[];

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("settings.title")}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {t("settings.subtitle")}
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-4 max-w-lg"
      >
        {/* ── AI API Keys ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-7 w-7 rounded-[var(--radius-sm)] flex items-center justify-center"
              style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}
            >
              <Cpu className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("settings.aiSection")}
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("settings.aiSubtitle")}
              </p>
            </div>
            {provider && (
              <span
                className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "var(--accent-subtle)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                {provider === "anthropic" ? "Anthropic" : provider === "gemini" ? "Gemini" : "OpenAI"} {t("settings.connected")}
              </span>
            )}
          </div>

          <div className="space-y-5">
            <ApiKeyInput
              label={t("common.active")}
              provider="Anthropic"
              placeholder="sk-ant-api03-…"
              value={getAnthropicKey()}
              onSave={setAnthropicKey}
              onClear={() => setAnthropicKey("")}
            />

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <ApiKeyInput
              label={t("common.active")}
              provider="Gemini"
              placeholder="AIzaSy…"
              value={getGeminiKey()}
              onSave={setGeminiKey}
              onClear={() => setGeminiKey("")}
            />

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <ApiKeyInput
              label={t("common.active")}
              provider="OpenAI"
              placeholder="sk-proj-…"
              value={getOpenAIKey()}
              onSave={setOpenAIKey}
              onClear={() => setOpenAIKey("")}
            />

            {/* Default provider selector (shown when any key is configured) */}
            {configuredProviders.length >= 1 && (
              <>
                <div className="h-px" style={{ background: "var(--border-subtle)" }} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {t("settings.defaultProv")}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {t("settings.defaultDesc")}
                    </p>
                  </div>
                  <SegmentedControl<DefaultProvider>
                    value={defaultProvider}
                    options={[
                      { value: "auto", label: t("settings.auto") },
                      ...(getAnthropicKey() ? [{ value: "anthropic" as DefaultProvider, label: "Anthropic" }] : []),
                      ...(getGeminiKey() ? [{ value: "gemini" as DefaultProvider, label: "Gemini" }] : []),
                      ...(getOpenAIKey() ? [{ value: "openai" as DefaultProvider, label: "OpenAI" }] : []),
                    ]}
                    onChange={setDefaultProvider}
                  />
                </div>
              </>
            )}

            {hasAnyKey && (
              <button
                onClick={clearKeys}
                className="text-[11px] transition-colors"
                style={{ color: "var(--danger)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                {t("settings.clearAll")}
              </button>
            )}
          </div>

          {/* Note */}
          <div
            className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 border"
            style={{
              background: "var(--bg-tertiary)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Metni seçip <kbd className="font-mono text-[10px] px-1 rounded" style={{ background: "var(--surface)" }}>⌘K</kbd> tuşuna basarak komut paletini açın.
              <strong style={{ color: "var(--text-secondary)" }}> Tematik Olarak Kodla</strong> komutu
              seçili metni analiz eder ve otomatik kodlar atar.
            </p>
          </div>
        </motion.div>

        {/* ── Appearance ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("settings.appearance")}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t("settings.theme")}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("settings.themeDesc")}</p>
              </div>
              <SegmentedControl
                value={theme}
                options={[
                  { value: "dark", label: t("settings.dark") },
                  { value: "light", label: t("settings.light") },
                ]}
                onChange={setTheme}
              />
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  <Globe className="h-3 w-3 inline mr-1.5" style={{ color: "var(--text-muted)" }} />
                  {t("settings.language")}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {t("settings.langDesc")}
                </p>
              </div>
              <SegmentedControl
                value={language}
                options={[
                  { value: "tr", label: "TR" },
                  { value: "en", label: "EN" },
                ]}
                onChange={setLanguage}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Data Management ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-7 w-7 rounded-[var(--radius-sm)] flex items-center justify-center"
              style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}
            >
              <Database className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {t("settings.dataManagement")}
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("settings.dataSubtitle")}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Export */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t("settings.exportBackup")}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t("settings.exportDesc")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-[11px] flex-shrink-0"
                onClick={handleExport}
                disabled={projects.length === 0}
              >
                <Download className="h-3 w-3" />
                {t("common.export")}
              </Button>
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            {/* Import from file */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t("settings.importFile")}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {t("settings.importDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {importStatus === "success" && (
                  <span className="text-[11px]" style={{ color: "var(--code-2)" }}>
                    <Check className="h-3 w-3 inline mr-0.5" />
                    {t("settings.saved")}
                  </span>
                )}
                {importStatus === "error" && (
                  <span className="text-[11px]" style={{ color: "var(--danger)" }}>
                    {t("common.error")}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={() => importRef.current?.click()}
                >
                  <Upload className="h-3 w-3" />
                  {t("common.import")}
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border-subtle)" }} />

            {/* Local Folder Sync (New) */}
            <div className="py-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <FolderOpen className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
                    {t("settings.localSync")}
                    <span className="text-[9px] px-1 rounded bg-[var(--accent-subtle)] color-[var(--accent)] border border-[var(--accent-border)] ml-1">{t("settings.premium")}</span>
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {t("settings.localSubtitle")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-[11px] flex-shrink-0"
                  onClick={async () => {
                    const { pickLocalSyncFolder } = await import("@/lib/localSync");
                    const path = await pickLocalSyncFolder();
                    if (path) {
                      const { useAuthStore } = await import("@/store/auth.store");
                      useAuthStore.getState().setLocalFolderPath(path);
                    }
                  }}
                >
                  <Settings className="h-3 w-3" />
                  {localFolderPath ? t("settings.changeFolder") : t("settings.selectFolder")}
                </Button>
                {localFolderPath && accessToken && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-[11px] flex-shrink-0 ml-2"
                    style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}
                    onClick={() => setSyncManagerOpen(true)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("settings.syncCenter")}
                  </Button>
                )}
              </div>

              {localFolderPath ? (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] border text-[11px]"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  <span className="truncate flex-1 mr-2">{localFolderPath}</span>
                  <button
                    onClick={() => {
                      const { useAuthStore } = require("@/store/auth.store");
                      useAuthStore.getState().setLocalFolderPath(null);
                    }}
                    className="p-1 hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                  {t("settings.noFolder")}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── About ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0">
              <AppLogo size={36} variant="badge" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {APP_NAME}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                v{APP_VERSION} · Qualitative Data Analysis
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {t("settings.aboutDesc")}
          </p>
        </motion.div>
      </motion.div>

      <SyncManager open={syncManagerOpen} onClose={() => setSyncManagerOpen(false)} />
    </div>
  );
}
