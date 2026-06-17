// ─── OpenAI Provider ─────────────────────────────────────────────────────────
//
// Logic extracted (moved, not reinvented) from the OpenAI branch of the
// original `askAi()` in `@/lib/ai`. Uses the shared `nativeHttp` helper so it
// behaves identically in dev and prod (Tauri reqwest, no WKWebView fetch).

import { nativeHttp } from "@/lib/nativeHttp";
import type {
  AiHealth,
  AiProvider,
  AiProviderType,
  AiRequest,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.5;

interface OpenAiChatResponse {
  choices: { message: { content: string } }[];
}

export class OpenAiProvider implements AiProvider {
  readonly type: AiProviderType = "openai";
  readonly isLocal = false;
  readonly displayName = "OpenAI";

  constructor(private readonly apiKey: string) {}

  async complete(req: AiRequest): Promise<string> {
    const res = await nativeHttp("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model ?? DEFAULT_MODEL,
        temperature: req.temperature ?? DEFAULT_TEMPERATURE,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        ...(req.jsonMode
          ? { response_format: { type: "json_object" as const } }
          : {}),
        messages: [
          { role: "system", content: req.systemPrompt },
          ...req.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`OpenAI request failed (HTTP ${res.status})`);
    }

    const data = JSON.parse(res.body) as OpenAiChatResponse;
    return data.choices[0]?.message?.content ?? "";
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
      return { status: "unreachable", message: "No OpenAI API key configured." };
    }
    return { status: "healthy" };
  }
}
