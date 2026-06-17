// ─── Anthropic Provider ──────────────────────────────────────────────────────
//
// Logic extracted (moved, not reinvented) from the Anthropic branch of the
// original `askAi()` in `@/lib/ai`. Uses the shared `nativeHttp` helper.

import { nativeHttp } from "@/lib/nativeHttp";
import type {
  AiHealth,
  AiProvider,
  AiProviderType,
  AiRequest,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "claude-3-5-haiku-latest";
const DEFAULT_MAX_TOKENS = 1024;

interface AnthropicMessagesResponse {
  content?: { text: string }[];
}

export class AnthropicProvider implements AiProvider {
  readonly type: AiProviderType = "anthropic";
  readonly isLocal = false;
  readonly displayName = "Anthropic";

  constructor(private readonly apiKey: string) {}

  async complete(req: AiRequest): Promise<string> {
    const res = await nativeHttp("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: req.model ?? DEFAULT_MODEL,
        max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        system: req.systemPrompt,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Anthropic request failed (HTTP ${res.status})`);
    }

    const data = JSON.parse(res.body) as AnthropicMessagesResponse;
    return data.content?.[0]?.text ?? "";
  }

  /**
   * TEMPORARY cloud limitation: streaming is not wired through `nativeHttp`
   * yet, so we fall back to a single non-streaming call and emit the whole
   * result as one chunk. Replace with true SSE streaming later.
   */
  async stream(
    req: AiRequest,
    onToken: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> {
    if (signal.aborted) return "";
    const full = await this.complete(req);
    if (!signal.aborted) onToken(full);
    return full;
  }

  /** Lightweight: healthy iff a key is present. No network round-trip. */
  async healthCheck(): Promise<AiHealth> {
    if (!this.apiKey) {
      return {
        status: "unreachable",
        message: "No Anthropic API key configured.",
      };
    }
    return { status: "healthy" };
  }
}
