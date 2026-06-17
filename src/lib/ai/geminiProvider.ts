// ─── Gemini Provider ─────────────────────────────────────────────────────────
//
// Logic extracted (moved, not reinvented) from the Gemini branch of the
// original `askAi()` in `@/lib/ai`. Uses the shared `nativeHttp` helper.
//
// Preserves the original behavior:
//   - system prompt via `system_instruction`
//   - "assistant" role mapped to Gemini's "model" role
//   - exponential-backoff retry on HTTP 429 (up to 3 attempts)

import { nativeHttp } from "@/lib/nativeHttp";
import type {
  AiHealth,
  AiProvider,
  AiProviderType,
  AiRequest,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 3;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class GeminiProvider implements AiProvider {
  readonly type: AiProviderType = "gemini";
  readonly isLocal = false;
  readonly displayName = "Google Gemini";

  constructor(private readonly apiKey: string) {}

  async complete(req: AiRequest): Promise<string> {
    const model = req.model ?? DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: req.systemPrompt }] },
      contents: req.messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      ...(req.jsonMode
        ? { generationConfig: { response_mime_type: "application/json" } }
        : {}),
    });

    let res: Awaited<ReturnType<typeof nativeHttp>> | undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      res = await nativeHttp(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const delay = 3000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }

    if (!res) throw new Error("Gemini API request failed to initiate.");

    if (res.status < 200 || res.status >= 300) {
      if (res.status === 429) {
        throw new Error(
          "Gemini quota exceeded (HTTP 429). Check your Google AI Studio billing/limits.",
        );
      }
      throw new Error(`Gemini request failed (HTTP ${res.status})`);
    }

    let data: GeminiResponse;
    try {
      data = JSON.parse(res.body) as GeminiResponse;
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) {
      throw new Error(
        `Gemini returned an unexpected format: ${res.body.substring(0, 100)}...`,
      );
    }
    return text;
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
      return { status: "unreachable", message: "No Gemini API key configured." };
    }
    return { status: "healthy" };
  }
}
