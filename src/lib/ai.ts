// ─── AI Types ───────────────────────────────────────────────────────────────

import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";
import { resolveProvider } from "@/lib/ai/providerRegistry";
import { useSettingsStore } from "@/store/settings.store";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ThematicCode {
  name: string;
  rationale: string;
}

export interface ThematicResult {
  codes: ThematicCode[];
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const THEMATIC_SYSTEM = `You are a qualitative data analysis expert specializing in thematic coding.
Given a research text excerpt, identify 1–4 meaningful thematic codes.
Return ONLY valid JSON in this exact shape:
{ "codes": [{ "name": "Short Label", "rationale": "One concise sentence." }] }
Requirements: code names must be 2–5 words in title case. No markdown, no commentary outside the JSON object.`;

// ─── Unified AI Call ──────────────────────────────────────────────────────────
//
// Provider selection is driven by Settings (getActiveProvider): cloud BYOK
// (OpenAI / Anthropic / Gemini) and local Ollama are fully interchangeable
// behind the AiProvider interface. The legacy `key` parameter is kept for
// call-site compatibility but is no longer used for routing — the active
// provider (and its key, if cloud) comes from the settings store, so local
// providers work with no key. Every existing AI feature (chat, synthesis,
// thematic coding) flows through here unchanged.

export async function askAi(
  _key: string | null,
  messages: Message[],
  systemPrompt: string,
  retryCount = 0
): Promise<string> {
  const config = useSettingsStore.getState().getActiveProvider();
  try {
    return await resolveProvider(config).complete({ messages, systemPrompt });
  } catch (err) {
    if (retryCount < 1) {
      await new Promise((r) => setTimeout(r, 2000));
      return askAi(_key, messages, systemPrompt, retryCount + 1);
    }
    throw err;
  }
}

// ─── Streaming AI Call ──────────────────────────────────────────────────────────
//
// Same provider routing as askAi, but streams tokens via the provider's
// stream() method. Ollama emits real incremental tokens; cloud providers fall
// back to a single chunk. The returned promise resolves to the full text.
// Callers pass an AbortSignal to support a Stop button; an aborted stream
// rejects with an AbortError after onToken has already received the partial.

export async function streamAi(
  messages: Message[],
  systemPrompt: string,
  onToken: (chunk: string) => void,
  signal: AbortSignal
): Promise<string> {
  const config = useSettingsStore.getState().getActiveProvider();
  return resolveProvider(config).stream({ messages, systemPrompt }, onToken, signal);
}

/** True when the active provider runs fully on the user's machine (Ollama). */
export function isActiveProviderLocal(): boolean {
  return useSettingsStore.getState().getActiveProvider().type === "ollama";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse JSON that a model may have wrapped in ```json fences or surrounded with
 * prose. Local models (esp. reasoning models) rarely return bare JSON, so we
 * strip fences and extract the outermost { … } before parsing.
 */
function parseLooseJson<T>(raw: string): T {
  let s = raw.trim();
  // Strip a leading ```json / ``` fence and a trailing ``` fence.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // If there's surrounding prose, keep only the outermost object.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

export async function analyzeThematicCodes(
  _key: string | null,
  text: string
): Promise<ThematicResult> {
  const config = useSettingsStore.getState().getActiveProvider();
  const lang = useAppStore.getState().language;
  // Force the model to write the human-readable values in the UI language while
  // keeping the JSON keys in English.
  const langInstruction = `\n\nIMPORTANT: Write every "name" and "rationale" value in the user's language (ISO language code: "${lang}"). Keep the JSON keys ("codes", "name", "rationale") in English.`;
  const messages: Message[] = [{ role: "user", content: `Analyze this excerpt:\n\n"${text}"` }];
  const raw = await resolveProvider(config).complete({
    messages,
    systemPrompt: THEMATIC_SYSTEM + langInstruction,
    jsonMode: true,
  });
  try {
    return parseLooseJson<ThematicResult>(raw);
  } catch {
    console.error("Failed to parse thematic analysis result:", raw);
    const lang = useAppStore.getState().language;
    throw new Error(t("ai.error.invalidFormat", lang));
  }
}
