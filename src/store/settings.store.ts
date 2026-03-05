import { create } from "zustand";
import { persist } from "zustand/middleware";
import { xorEncode, xorDecode, SETTINGS_CIPHER } from "@/lib/crypto";

export type AiProvider = "openai" | "anthropic" | "gemini" | null;
export type DefaultProvider = "auto" | "openai" | "anthropic" | "gemini";

// Obfuscation is now handled in @/lib/crypto


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

  getOpenAIKey: () => string;
  getAnthropicKey: () => string;
  getGeminiKey: () => string;
  /** Returns the active key based on defaultProvider setting */
  getActiveKey: () => string | null;
  getProvider: () => AiProvider;

  setOpenAIKey: (k: string) => void;
  setAnthropicKey: (k: string) => void;
  setGeminiKey: (k: string) => void;
  setDefaultProvider: (p: DefaultProvider) => void;
  clearKeys: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      _ek1: "",
      _ek2: "",
      _ek3: "",
      defaultProvider: "auto",

      getOpenAIKey: () => xorDecode(get()._ek1, SETTINGS_CIPHER),
      getAnthropicKey: () => xorDecode(get()._ek2, SETTINGS_CIPHER),
      getGeminiKey: () => xorDecode(get()._ek3, SETTINGS_CIPHER),

      getActiveKey: () => {
        const { defaultProvider, _ek1, _ek2, _ek3 } = get();
        const openai = xorDecode(_ek1, SETTINGS_CIPHER);
        const anthropic = xorDecode(_ek2, SETTINGS_CIPHER);
        const gemini = xorDecode(_ek3, SETTINGS_CIPHER);

        if (defaultProvider === "anthropic" && anthropic) return anthropic;
        if (defaultProvider === "openai" && openai) return openai;
        if (defaultProvider === "gemini" && gemini) return gemini;

        // "auto" fallback priority: Anthropic > Gemini > OpenAI
        return anthropic || gemini || openai || null;
      },

      getProvider: (): AiProvider => {
        const { defaultProvider, _ek1, _ek2, _ek3 } = get();
        const openai = xorDecode(_ek1, SETTINGS_CIPHER);
        const anthropic = xorDecode(_ek2, SETTINGS_CIPHER);
        const gemini = xorDecode(_ek3, SETTINGS_CIPHER);

        if (defaultProvider === "anthropic" && anthropic) return "anthropic";
        if (defaultProvider === "openai" && openai) return "openai";
        if (defaultProvider === "gemini" && gemini) return "gemini";

        // "auto" fallback
        if (anthropic) return "anthropic";
        if (gemini) return "gemini";
        if (openai) return "openai";
        return null;
      },

      setOpenAIKey: (k) => set({ _ek1: xorEncode(k, SETTINGS_CIPHER) }),
      setAnthropicKey: (k) => set({ _ek2: xorEncode(k, SETTINGS_CIPHER) }),
      setGeminiKey: (k) => set({ _ek3: xorEncode(k, SETTINGS_CIPHER) }),
      setDefaultProvider: (p) => set({ defaultProvider: p }),
      clearKeys: () => set({ _ek1: "", _ek2: "", _ek3: "" }),
    }),
    { name: "qo-settings" }
  )
);
