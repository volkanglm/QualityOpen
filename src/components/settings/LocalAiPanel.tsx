import { useEffect, useState } from "react";
import { Cpu, RefreshCw, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import { useLocalAiStore, type LocalAiStatus } from "@/store/localAi.store";
import { useT } from "@/hooks/useT";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Local-AI (Ollama) settings section.
 *
 * Shows the live connection status, lets the user point at a different Ollama
 * base URL, pick the active model, manually refresh, and read concise install
 * hints. Polling starts on mount and stops on unmount.
 *
 * i18n: new copy here ships as plain English because `useT` is strict-typed and
 * the keys below do not yet exist in the locale dictionaries. Suggested keys to
 * add to src/locales/{tr,en}.ts are listed in the PR/report.
 */

const STATUS_DOT: Record<LocalAiStatus, string> = {
  healthy: "#22c55e", // green
  degraded: "#f59e0b", // amber
  unreachable: "#ef4444", // red
  unknown: "#9ca3af", // grey
};

const STATUS_LABEL_KEY: Record<LocalAiStatus, TranslationKey> = {
  healthy: "localai.statusConnected",
  degraded: "localai.statusDegraded",
  unreachable: "localai.statusUnreachable",
  unknown: "localai.statusChecking",
};

export function LocalAiPanel() {
  const t = useT();
  const ollamaBaseUrl = useSettingsStore((s) => s.ollamaBaseUrl);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const setOllamaBaseUrl = useSettingsStore((s) => s.setOllamaBaseUrl);
  const setOllamaModel = useSettingsStore((s) => s.setOllamaModel);

  const status = useLocalAiStore((s) => s.status);
  const latencyMs = useLocalAiStore((s) => s.latencyMs);
  const modelsAvailable = useLocalAiStore((s) => s.modelsAvailable);
  const checkHealth = useLocalAiStore((s) => s.checkHealth);
  const startPolling = useLocalAiStore((s) => s.startPolling);
  const stopPolling = useLocalAiStore((s) => s.stopPolling);

  const [refreshing, setRefreshing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOllamaBaseUrl(e.target.value);
    // Re-probe the (possibly new) endpoint.
    void checkHealth();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkHealth();
    } finally {
      setRefreshing(false);
    }
  };

  const isUnreachable = status === "unreachable";

  // Model options: prefer the live list; fall back to the currently-configured
  // model so the select is never empty.
  const modelOptions =
    modelsAvailable.length > 0
      ? modelsAvailable
      : ollamaModel
        ? [ollamaModel]
        : [];

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Local AI (Ollama)
        </h2>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full flex-shrink-0",
              status === "unknown" && "animate-pulse"
            )}
            style={{ background: STATUS_DOT[status] }}
            aria-hidden="true"
          />
          <span
            className="text-xs font-medium flex-shrink-0"
            style={{ color: "var(--text-primary)" }}
          >
            {t(STATUS_LABEL_KEY[status])}
          </span>
          <span
            className="text-[11px] truncate"
            style={{ color: "var(--text-muted)" }}
            title={ollamaBaseUrl}
          >
            {ollamaBaseUrl}
          </span>
          {status === "healthy" && latencyMs != null && (
            <span
              className="text-[11px] flex-shrink-0 tabular-nums"
              style={{ color: "var(--code-2)" }}
            >
              {latencyMs}ms
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-all disabled:opacity-50 flex-shrink-0"
          style={{
            color: "var(--accent)",
            borderColor: "var(--border-subtle)",
            background: "var(--bg-tertiary)",
          }}
        >
          <RefreshCw className={cn("h-2.5 w-2.5", refreshing && "animate-spin")} />
          {t("localai.refresh")}
        </button>
      </div>

      {/* Unreachable warning */}
      {isUnreachable && (
        <div
          className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 border"
          style={{
            background: "var(--danger-subtle)",
            borderColor: "var(--danger)",
          }}
        >
          <AlertTriangle
            className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
            style={{ color: "var(--danger)" }}
          />
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {t("localai.unreachableWarning")}
          </p>
        </div>
      )}

      {/* Base URL */}
      <div className="space-y-1.5 mb-4">
        <label
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("localai.baseUrl")}
        </label>
        <input
          type="text"
          value={ollamaBaseUrl}
          onChange={handleBaseUrlChange}
          placeholder="http://localhost:11434"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full h-8 rounded-[var(--radius-sm)] border px-3 text-[13px] outline-none transition-colors font-mono"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-subtle)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Active model */}
      <div className="space-y-1.5 mb-4">
        <label
          className="text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("localai.activeModel")}
        </label>
        <select
          value={ollamaModel}
          onChange={(e) => setOllamaModel(e.target.value)}
          className="w-full h-8 rounded-[var(--radius-sm)] border px-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {modelOptions.length === 0 ? (
            <option value="" disabled>
              {t("localai.noModels")}
            </option>
          ) : (
            modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))
          )}
        </select>
        {modelsAvailable.length === 0 && status === "healthy" && (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Connected, but no models are installed yet. Run{" "}
            <code className="font-mono">ollama pull llama3.1:8b</code>.
          </p>
        )}
      </div>

      {/* Setup guide */}
      <div
        className="rounded-[var(--radius-sm)] border overflow-hidden"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <button
          onClick={() => setGuideOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          aria-expanded={guideOpen}
        >
          <span className="text-[12px] font-medium">Setup guide</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", guideOpen && "rotate-180")}
          />
        </button>

        {guideOpen && (
          <div
            className="px-3 py-3 space-y-3 text-[11px] leading-relaxed border-t"
            style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}
          >
            <div>
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
                macOS
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-mono">{`brew install ollama
ollama serve`}</pre>
            </div>

            <div>
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
                Windows
              </p>
              <p className="mt-1">
                Download and run the installer from{" "}
                <span className="font-mono">ollama.com</span>.
              </p>
            </div>

            <div>
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
                Linux
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-mono">{`curl -fsSL https://ollama.com/install.sh | sh`}</pre>
            </div>

            <div>
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
                Pull a model
              </p>
              <pre className="mt-1 whitespace-pre-wrap font-mono">{`ollama pull llama3.1:8b`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
