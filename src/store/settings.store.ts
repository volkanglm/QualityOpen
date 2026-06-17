import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
// xorDecode is kept only for one-time migration of old localStorage keys
import { xorDecode, SETTINGS_CIPHER } from "@/lib/crypto";
import type { ActiveProviderConfig } from "@/lib/ai/provider";

export type AiProvider = "openai" | "anthropic" | "gemini" | null;
export type DefaultProvider = "auto" | "openai" | "anthropic" | "gemini" | "ollama";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1:8b";

/** Semantic-search embedding source. (Anthropic has no embeddings API.) */
export type EmbedProvider = "ollama" | "openai" | "gemini";
const DEFAULT_EMBED_PROVIDER: EmbedProvider = "ollama";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";
const DEFAULT_CHUNK_SIZE = 1200;

const SERVICE = "qualityopen";

// ─── Store ────────────────────────────────────────────────────────────────────

interface SettingsStore {
  /** Preferred provider when multiple keys are configured */
  defaultProvider: DefaultProvider;

  /** Local LLM (Ollama) connection — non-sensitive, persisted */
  ollamaBaseUrl: string;
  ollamaModel: string;

  /** Semantic search (embeddings) config — non-sensitive, persisted */
  embedProvider: EmbedProvider;
  embedModel: string;
  embedChunkSize: number;
  /** When true, raw document text is chunked + indexed (cross-file content
   *  search). Off by default — keeps the index small / fast. */
  embedIndexDocuments: boolean;

  /** In-memory only — loaded from OS keychain at startup, never persisted to localStorage */
  _openai: string;
  _anthropic: string;
  _gemini: string;

  /** True after loadKeys() has completed */
  keysLoaded: boolean;

  /** Optional migration fields — populated from old localStorage on first load, then cleared */
  _ek1?: string;
  _ek2?: string;
  _ek3?: string;

  loadKeys: () => Promise<void>;

  getOpenAIKey: () => string;
  getAnthropicKey: () => string;
  getGeminiKey: () => string;
  /** Returns the active key based on defaultProvider setting */
  getActiveKey: () => string | null;
  getProvider: () => AiProvider;
  /** Single source of truth for which provider (cloud or local) all AI features use */
  getActiveProvider: () => ActiveProviderConfig;

  setOpenAIKey: (k: string) => Promise<void>;
  setAnthropicKey: (k: string) => Promise<void>;
  setGeminiKey: (k: string) => Promise<void>;
  setDefaultProvider: (p: DefaultProvider) => void;
  setOllamaBaseUrl: (url: string) => void;
  setOllamaModel: (model: string) => void;
  setEmbedProvider: (p: EmbedProvider) => void;
  setEmbedModel: (m: string) => void;
  setEmbedChunkSize: (n: number) => void;
  setEmbedIndexDocuments: (b: boolean) => void;
  clearKeys: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      defaultProvider: "auto",
      ollamaBaseUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      embedProvider: DEFAULT_EMBED_PROVIDER,
      embedModel: DEFAULT_EMBED_MODEL,
      embedChunkSize: DEFAULT_CHUNK_SIZE,
      embedIndexDocuments: false,
      _openai: "",
      _anthropic: "",
      _gemini: "",
      keysLoaded: false,

      loadKeys: async () => {
        // ── Migration: move old XOR-obfuscated keys from localStorage to OS keychain ──
        const { _ek1, _ek2, _ek3 } = get();
        if (_ek1 || _ek2 || _ek3) {
          try {
            if (_ek1) {
              const raw = xorDecode(_ek1, SETTINGS_CIPHER);
              if (raw) await invoke("keyring_set", { service: SERVICE, key: "openai", value: raw });
            }
            if (_ek2) {
              const raw = xorDecode(_ek2, SETTINGS_CIPHER);
              if (raw) await invoke("keyring_set", { service: SERVICE, key: "anthropic", value: raw });
            }
            if (_ek3) {
              const raw = xorDecode(_ek3, SETTINGS_CIPHER);
              if (raw) await invoke("keyring_set", { service: SERVICE, key: "gemini", value: raw });
            }
          } catch (e) {
            console.error("[Settings] Migration to keychain failed:", e);
          }
          // Clear old obfuscated keys — next persist save will omit them
          set({ _ek1: undefined, _ek2: undefined, _ek3: undefined });
        }

        // ── Load from OS keychain into memory ──
        console.log("[Settings] Loading keys from keychain...");
        try {
          const providers: Array<"openai" | "anthropic" | "gemini"> = ["openai", "anthropic", "gemini"];
          const newKeys: Partial<Record<"_openai" | "_anthropic" | "_gemini", string>> = {};

          for (const p of providers) {
            try {
              const key = await invoke<string | null>("keyring_get", { service: SERVICE, key: p });
              if (key) {
                newKeys[`_${p}`] = key;
                console.log(`[Settings] Loaded key for ${p}`);
              }
            } catch (err) {
              // keyring_get might fail if item doesn't exist; that's fine
              console.debug(`[Settings] No keychain entry for ${p}`);
            }
          }

          set({ ...newKeys, keysLoaded: true });
          console.log("[Settings] Keychain load complete.");
        } catch (e) {
          console.error("[Settings] Critical error loading keys from keychain:", e);
          set({ keysLoaded: true }); // Still mark as loaded so app can proceed
        }
      },

      getOpenAIKey: () => get()._openai,
      getAnthropicKey: () => get()._anthropic,
      getGeminiKey: () => get()._gemini,

      getActiveKey: () => {
        const { defaultProvider, _openai, _anthropic, _gemini } = get();
        if (defaultProvider === "anthropic" && _anthropic) return _anthropic;
        if (defaultProvider === "openai" && _openai) return _openai;
        if (defaultProvider === "gemini" && _gemini) return _gemini;
        return _anthropic || _gemini || _openai || null;
      },

      getProvider: (): AiProvider => {
        const { defaultProvider, _openai, _anthropic, _gemini } = get();
        if (defaultProvider === "anthropic" && _anthropic) return "anthropic";
        if (defaultProvider === "openai" && _openai) return "openai";
        if (defaultProvider === "gemini" && _gemini) return "gemini";
        if (_anthropic) return "anthropic";
        if (_gemini) return "gemini";
        if (_openai) return "openai";
        return null;
      },

      getActiveProvider: (): ActiveProviderConfig => {
        const { defaultProvider, _openai, _anthropic, _gemini, ollamaBaseUrl, ollamaModel } = get();

        // Explicit local selection — no API key required.
        if (defaultProvider === "ollama") {
          return { type: "ollama", ollamaBaseUrl, ollamaModel };
        }

        // Explicit cloud selection (only honored when that key exists).
        if (defaultProvider === "anthropic" && _anthropic) return { type: "anthropic", apiKey: _anthropic };
        if (defaultProvider === "openai" && _openai) return { type: "openai", apiKey: _openai };
        if (defaultProvider === "gemini" && _gemini) return { type: "gemini", apiKey: _gemini };

        // "auto" / fallback — first configured cloud key, then local as last resort
        // so the app still works with zero BYOK keys.
        if (_anthropic) return { type: "anthropic", apiKey: _anthropic };
        if (_gemini) return { type: "gemini", apiKey: _gemini };
        if (_openai) return { type: "openai", apiKey: _openai };
        return { type: "ollama", ollamaBaseUrl, ollamaModel };
      },

      setOpenAIKey: async (k) => {
        set({ _openai: k }); // Optimistic: UI updates immediately
        try {
          if (k) await invoke("keyring_set", { service: SERVICE, key: "openai", value: k });
          else await invoke("keyring_delete", { service: SERVICE, key: "openai" });
        } catch (e) {
          console.error("[Settings] Failed to save OpenAI key to keychain:", e);
        }
      },

      setAnthropicKey: async (k) => {
        set({ _anthropic: k });
        try {
          if (k) await invoke("keyring_set", { service: SERVICE, key: "anthropic", value: k });
          else await invoke("keyring_delete", { service: SERVICE, key: "anthropic" });
        } catch (e) {
          console.error("[Settings] Failed to save Anthropic key to keychain:", e);
        }
      },

      setGeminiKey: async (k) => {
        set({ _gemini: k });
        try {
          if (k) await invoke("keyring_set", { service: SERVICE, key: "gemini", value: k });
          else await invoke("keyring_delete", { service: SERVICE, key: "gemini" });
        } catch (e) {
          console.error("[Settings] Failed to save Gemini key to keychain:", e);
        }
      },

      setDefaultProvider: (p) => set({ defaultProvider: p }),
      setOllamaBaseUrl: (url) => set({ ollamaBaseUrl: url }),
      setOllamaModel: (model) => set({ ollamaModel: model }),
      setEmbedProvider: (p) => set({ embedProvider: p }),
      setEmbedModel: (m) => set({ embedModel: m }),
      setEmbedChunkSize: (n) => set({ embedChunkSize: n }),
      setEmbedIndexDocuments: (b) => set({ embedIndexDocuments: b }),

      clearKeys: async () => {
        set({ _openai: "", _anthropic: "", _gemini: "" });
        try {
          await Promise.all([
            invoke("keyring_delete", { service: SERVICE, key: "openai" }),
            invoke("keyring_delete", { service: SERVICE, key: "anthropic" }),
            invoke("keyring_delete", { service: SERVICE, key: "gemini" }),
          ]);
        } catch (e) {
          console.error("[Settings] Failed to clear keys from keychain:", e);
        }
      },
    }),
    {
      name: "qo-settings",
      // Only persist non-sensitive preferences — keys live in OS keychain
      partialize: (state) => ({
        defaultProvider: state.defaultProvider,
        ollamaBaseUrl: state.ollamaBaseUrl,
        ollamaModel: state.ollamaModel,
        embedProvider: state.embedProvider,
        embedModel: state.embedModel,
        embedChunkSize: state.embedChunkSize,
        embedIndexDocuments: state.embedIndexDocuments,
      }),
    }
  )
);
