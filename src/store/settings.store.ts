import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
// xorDecode is kept only for one-time migration of old localStorage keys
import { xorDecode, SETTINGS_CIPHER } from "@/lib/crypto";

export type AiProvider = "openai" | "anthropic" | "gemini" | null;
export type DefaultProvider = "auto" | "openai" | "anthropic" | "gemini";

const SERVICE = "qualityopen";

// ─── Store ────────────────────────────────────────────────────────────────────

interface SettingsStore {
  /** Preferred provider when multiple keys are configured */
  defaultProvider: DefaultProvider;

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

  setOpenAIKey: (k: string) => Promise<void>;
  setAnthropicKey: (k: string) => Promise<void>;
  setGeminiKey: (k: string) => Promise<void>;
  setDefaultProvider: (p: DefaultProvider) => void;
  clearKeys: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      defaultProvider: "auto",
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
        try {
          const [openai, anthropic, gemini] = await Promise.all([
            invoke<string | null>("keyring_get", { service: SERVICE, key: "openai" }),
            invoke<string | null>("keyring_get", { service: SERVICE, key: "anthropic" }),
            invoke<string | null>("keyring_get", { service: SERVICE, key: "gemini" }),
          ]);
          set({
            _openai: openai ?? "",
            _anthropic: anthropic ?? "",
            _gemini: gemini ?? "",
            keysLoaded: true,
          });
        } catch (e) {
          console.error("[Settings] Failed to load keys from keychain:", e);
          set({ keysLoaded: true });
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
      // Only persist non-sensitive preference — keys live in OS keychain
      partialize: (state) => ({ defaultProvider: state.defaultProvider }),
    }
  )
);
