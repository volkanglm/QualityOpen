// ─── Provider Registry ───────────────────────────────────────────────────────
//
// Pure factory: given an `ActiveProviderConfig`, build the matching
// `AiProvider`. Intentionally has NO dependency on the settings store so it
// stays trivially testable — the store produces the config, this resolves it.

import type { ActiveProviderConfig, AiProvider, AiProviderType } from "@/lib/ai/provider";
import { OpenAiProvider } from "@/lib/ai/openaiProvider";
import { AnthropicProvider } from "@/lib/ai/anthropicProvider";
import { GeminiProvider } from "@/lib/ai/geminiProvider";
import { OllamaProvider } from "@/lib/ai/ollamaProvider";

/** Cloud (BYOK) provider types — i.e. everything that requires an API key. */
export const CLOUD_PROVIDERS: readonly AiProviderType[] = [
  "openai",
  "anthropic",
  "gemini",
] as const;

/** True for cloud providers, false for local (Ollama). */
export function isCloudProvider(type: AiProviderType): boolean {
  return CLOUD_PROVIDERS.includes(type);
}

/**
 * Construct the concrete `AiProvider` for a config.
 *
 * Throws if a cloud provider is requested without an API key — callers should
 * surface this as a "configure your key" error.
 */
export function resolveProvider(config: ActiveProviderConfig): AiProvider {
  switch (config.type) {
    case "openai":
      return new OpenAiProvider(requireKey(config, "OpenAI"));
    case "anthropic":
      return new AnthropicProvider(requireKey(config, "Anthropic"));
    case "gemini":
      return new GeminiProvider(requireKey(config, "Gemini"));
    case "ollama":
      return new OllamaProvider(config.ollamaBaseUrl, config.ollamaModel);
    default: {
      // Exhaustiveness guard — a new AiProviderType must be handled above.
      const _never: never = config.type;
      throw new Error(`Unsupported AI provider: ${String(_never)}`);
    }
  }
}

function requireKey(config: ActiveProviderConfig, label: string): string {
  if (!config.apiKey) {
    throw new Error(`No ${label} API key configured.`);
  }
  return config.apiKey;
}
