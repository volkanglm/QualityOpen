import { useState, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { Settings, Key, Eye, EyeOff, Check, Trash2, Info, Cpu, Globe, Download, Upload, Database, RefreshCw } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useAuthStore } from "@/store/auth.store";
import { useSettingsStore, type DefaultProvider } from "@/store/settings.store";
import { useLicenseStore } from "@/store/license.store";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { SyncManager } from "@/components/sync/SyncManager";
import { FolderOpen, BadgeCheck } from "lucide-react";

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

// ─── Check Update Button ──────────────────────────────────────────────────────

function CheckUpdateButton() {
  const [checking, setChecking] = useState(false);
  const t = useT();

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { useToastStore } = await import("@/store/toast.store");
      const update = await check();
      if (update?.available) {
        useToastStore.getState().push(t("update.ready"), "success");
      } else {
        useToastStore.getState().push(t("update.upToDate"), "success");
      }
    } catch (e: unknown) {
      if (!import.meta.env.DEV) {
        const { useToastStore } = await import("@/store/toast.store");
        const msg = e instanceof Error ? e.message : String(e);
        useToastStore.getState().push(`Update check failed: ${msg}`, "error");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <button
      onClick={handleCheck}
      disabled={checking}
      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-all disabled:opacity-50"
      style={{
        color: "var(--accent)",
        borderColor: "var(--border-subtle)",
        background: "var(--bg-tertiary)",
      }}
    >
      {checking ? (
        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <RefreshCw className="h-2.5 w-2.5" />
      )}
      {checking ? t("settings.checkingUpdate") : t("settings.checkUpdate")}
    </button>
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

  const { isPro, licenseKey, activateLicense, deactivateLicense } = useLicenseStore();

  const t = useT();
  const provider = getProvider();
  const hasAnyKey = !!(getOpenAIKey() || getAnthropicKey() || getGeminiKey());

  const importRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  const [syncManagerOpen, setSyncManagerOpen] = useState(false);
  const [draftLicense, setDraftLicense] = useState("");
  const [licenseLoading, setLicenseLoading] = useState(false);

  const handleSelectFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: t("settings.selectFolder"),
      });

      if (selected && typeof selected === "string") {
        useAuthStore.getState().setLocalFolderPath(selected);
      }
    } catch (err) {
      console.error("Folder selection failed:", err);
    }
  };

  const handleActivateLicense = async () => {
    if (!draftLicense.trim()) return;
    setLicenseLoading(true);
    const result = await activateLicense(draftLicense.trim());
    setLicenseLoading(false);

    if (result.success) {
      setDraftLicense("");
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(t("license.successToast"), "success");
    } else {
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(result.error || t("license.invalidKey"), "error");
    }
  };

  const handleExport = async () => {
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      projects,
      documents,
      codes,
      segments,
      memos,
    };

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const { useToastStore } = await import("@/store/toast.store");

      const dateStr = new Date().toISOString().slice(0, 10);
      const filePath = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: `QualityOpen_backup_${dateStr}.json`,
      });

      if (!filePath) return;

      await writeTextFile(filePath, JSON.stringify(payload, null, 2));
      useToastStore.getState().push(t("settings.exportSuccess"), "success");
    } catch (err) {
      console.error("Export failed:", err);
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(t("settings.exportError"), "error");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { z } = await import("zod");
      const text = await file.text();
      const raw = JSON.parse(text);

      const schema = z.object({
        projects: z.array(z.any()),
        documents: z.array(z.any()),
        codes: z.array(z.any()),
        segments: z.array(z.any()).optional(),
        memos: z.array(z.any()).optional(),
      });

      const payload = schema.parse(raw);

      importBackup({
        projects: payload.projects,
        documents: payload.documents,
        codes: payload.codes,
        segments: payload.segments ?? [],
        memos: payload.memos ?? [],
      });
      setImportStatus("success");
      setTimeout(() => setImportStatus("idle"), 3000);
    } catch (err) {
      console.error("Import validation failed:", err);
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
              {t('welcome.hint')}
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

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors cursor-pointer"
                style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "32px" }}
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="nl">Nederlands</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* ── License Management ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("settings.licenseSection")}
            </h2>
          </div>
          <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
            {t("settings.licenseSubtitle")}
          </p>

          <div className="space-y-4">
            {isPro ? (
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--code-2)]" />
                    <h3 className="text-xs font-semibold" style={{ color: "var(--code-2)" }}>
                      {t("settings.proActive")}
                    </h3>
                  </div>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "var(--text-secondary)" }}>
                    {licenseKey ? `${licenseKey.slice(0, 8)}••••••••${licenseKey.slice(-4)}` : "Developer/Pro Bypass"}
                  </p>
                </div>
                {licenseKey && (
                  <Button size="sm" variant="outline" className="h-8 text-[11px] text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10" onClick={() => deactivateLicense()}>
                    {t("settings.deactivate")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("settings.licenseKeyHolder")}
                  value={draftLicense}
                  onChange={(e) => setDraftLicense(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleActivateLicense()}
                  className="w-full h-8 rounded-[var(--radius-sm)] border px-3 text-xs font-mono outline-none"
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
                <Button
                  size="sm"
                  variant="primary"
                  className="h-8 gap-1 text-[11px] flex-shrink-0"
                  onClick={handleActivateLicense}
                  disabled={!draftLicense.trim() || licenseLoading}
                >
                  {licenseLoading ? t("settings.activating") : t("settings.activate")}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Data Management ── */}
        <motion.div
          variants={itemVariants}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("settings.dataManagement")}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {t("settings.exportBackup")}
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t("settings.exportDesc")}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={handleExport}>
                  <Download className="h-3 w-3 mr-1.5" />
                  {t("common.export")}
                </Button>
              </div>
              <div className="h-px my-3" style={{ background: "var(--border-subtle)" }} />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {t("settings.importFile")}
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t("settings.importDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {importStatus === "success" && <Check className="h-3.5 w-3.5 text-[var(--code-2)]" />}
                  <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => importRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1.5" />
                    {t("common.import")}
                  </Button>
                </div>
                <input ref={importRef} type="file" className="hidden" accept=".json" onChange={handleImportFile} />
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <FolderOpen className="h-3 w-3" />
                    {t("settings.localSync")}
                    {!isPro && (
                      <span className="text-[9px] px-1 rounded bg-[rgba(234,179,8,0.1)] text-yellow-500 font-bold ml-1">
                        {t("settings.premium")}
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t("settings.localSubtitle")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!localFolderPath && isPro && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-[11px] flex-shrink-0"
                      onClick={handleSelectFolder}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {t("settings.selectFolder")}
                    </Button>
                  )}
                  {localFolderPath && accessToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-[11px] flex-shrink-0"
                      style={{ borderColor: "var(--accent-border)", color: "var(--accent)" }}
                      onClick={() => setSyncManagerOpen(true)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t("settings.syncCenter")}
                    </Button>
                  )}
                </div>
              </div>

              {localFolderPath ? (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] border text-[11px]"
                  style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  <span className="truncate flex-1 mr-2">{localFolderPath}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSelectFolder}
                      className="p-1 hover:text-[var(--accent)] transition-colors"
                      title={t("settings.changeFolder")}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        useAuthStore.getState().setLocalFolderPath(null);
                      }}
                      className="p-1 hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  v{APP_VERSION} · Qualitative Data Analysis
                </p>
                <CheckUpdateButton />
              </div>
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
