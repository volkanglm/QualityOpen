import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiProvider = "openai" | "anthropic" | "gemini" | null;
export type DefaultProvider = "auto" | "openai" | "anthropic" | "gemini";

// ─── XOR obfuscation ──────────────────────────────────────────────────────────
// Prevents raw API keys from appearing as plaintext in localStorage.
// Not cryptographic, but significantly better than plaintext storage.
const CIPHER = "QO_v1_2024_QualityOpen_cipher_salt_desktop_app_key";

function xorEncode(s: string): string {
  if (!s) return "";
  try {
    let r = "";
    for (let i = 0; i < s.length; i++)
      r += String.fromCharCode(s.charCodeAt(i) ^ CIPHER.charCodeAt(i % CIPHER.length));
    return btoa(r);
  } catch { return ""; }
}

function xorDecode(e: string): string {
  if (!e) return "";
  try {
    const s = atob(e);
    let r = "";
    for (let i = 0; i < s.length; i++)
      r += String.fromCharCode(s.charCodeAt(i) ^ CIPHER.charCodeAt(i % CIPHER.length));
    return r;
  } catch { return ""; }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SettingsStore {
  /** XOR-encoded OpenAI key (never raw) */
  _ek1: string;
  /** XOR-encoded Anthropic key (never raw) */
  _ek2: string;
  /** XOR-encoded Gemini key (never raw) */
  _ek3: string;
  /** Preferred provider when multiple keys are configured */
  defaultProvider: DefaultProvider;

  getOpenAIKey:    () => string;
  getAnthropicKey: () => string;
  getGeminiKey:    () => string;
  /** Returns the active key based on defaultProvider setting */
  getActiveKey:    () => string | null;
  getProvider:     () => AiProvider;

  setOpenAIKey:        (k: string) => void;
  setAnthropicKey:     (k: string) => void;
  setGeminiKey:        (k: string) => void;
  setDefaultProvider:  (p: DefaultProvider) => void;
  clearKeys:           () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      _ek1: "",
      _ek2: "",
      _ek3: "",
      defaultProvider: "auto",

      getOpenAIKey:    () => xorDecode(get()._ek1),
      getAnthropicKey: () => xorDecode(get()._ek2),
      getGeminiKey:    () => xorDecode(get()._ek3),

      getActiveKey: () => {
        const { defaultProvider, _ek1, _ek2, _ek3 } = get();
        const openai    = xorDecode(_ek1);
        const anthropic = xorDecode(_ek2);
        const gemini    = xorDecode(_ek3);

        if (defaultProvider === "anthropic" && anthropic) return anthropic;
        if (defaultProvider === "openai"    && openai)    return openai;
        if (defaultProvider === "gemini"    && gemini)    return gemini;

        // "auto" fallback priority: Anthropic > Gemini > OpenAI
        return anthropic || gemini || openai || null;
      },

      getProvider: (): AiProvider => {
        const { defaultProvider, _ek1, _ek2, _ek3 } = get();
        const openai    = xorDecode(_ek1);
        const anthropic = xorDecode(_ek2);
        const gemini    = xorDecode(_ek3);

        if (defaultProvider === "anthropic" && anthropic) return "anthropic";
        if (defaultProvider === "openai"    && openai)    return "openai";
        if (defaultProvider === "gemini"    && gemini)    return "gemini";

        // "auto" fallback
        if (anthropic) return "anthropic";
        if (gemini)    return "gemini";
        if (openai)    return "openai";
        return null;
      },

      setOpenAIKey:       (k) => set({ _ek1: xorEncode(k) }),
      setAnthropicKey:    (k) => set({ _ek2: xorEncode(k) }),
      setGeminiKey:       (k) => set({ _ek3: xorEncode(k) }),
      setDefaultProvider: (p) => set({ defaultProvider: p }),
      clearKeys:          ()  => set({ _ek1: "", _ek2: "", _ek3: "" }),
    }),
    { name: "qo-settings" }
  )
);
