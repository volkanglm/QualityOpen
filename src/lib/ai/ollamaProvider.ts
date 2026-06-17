// ─── Ollama Provider (local) ─────────────────────────────────────────────────
//
// Local, on-device LLM backend. Talks to a running Ollama server (default
// http://127.0.0.1:11434) through the Tauri Rust `local_http` commands rather
// than the browser fetch, mirroring how cloud providers use `native_http`.
//
// Tauri command contracts (built in parallel — DO NOT change these shapes):
//   - local_http(method, url, headersJson, body) -> [statusCode, bodyText]
//   - local_http_stream(reqId, method, url, headersJson, body)
//       emits events on `local-stream://${reqId}` with payloads:
//         { type: "chunk", data: string } | { type: "done" }
//         | { type: "error", message: string }
//   - local_ai_health(baseUrl) -> { status, latencyMs, modelsAvailable }

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AiHealth,
  AiProvider,
  AiProviderType,
  AiRequest,
} from "@/lib/ai/provider";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1:8b";

/** Ollama chat roles. The app only has "user"/"assistant"; both map 1:1. */
type OllamaRole = "system" | "user" | "assistant";

interface OllamaChatMessage {
  role: OllamaRole;
  content: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
}

type StreamEvent =
  | { type: "chunk"; data: string }
  | { type: "done" }
  | { type: "error"; message: string };

interface LocalAiHealthResponse {
  status: string;
  latencyMs: number;
  modelsAvailable: string[];
}

export class OllamaProvider implements AiProvider {
  readonly type: AiProviderType = "ollama";
  readonly isLocal = true;
  readonly displayName = "Ollama (local)";

  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl?: string, model?: string) {
    // Strip a trailing slash so `${baseUrl}/api/chat` never doubles up.
    const url = (baseUrl ?? DEFAULT_BASE_URL).trim();
    this.baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    this.model = model ?? DEFAULT_MODEL;
  }

  /** Prepend the system prompt and map app roles to Ollama roles. */
  private buildMessages(req: AiRequest): OllamaChatMessage[] {
    return [
      { role: "system", content: req.systemPrompt },
      ...req.messages.map((m): OllamaChatMessage => ({
        role: m.role, // "user" | "assistant" — both valid Ollama roles
        content: m.content,
      })),
    ];
  }

  private buildBody(req: AiRequest, stream: boolean): string {
    // NOTE: Ollama's native `format: "json"` makes some reasoning models (e.g.
    // gemma) return EMPTY content, so we deliberately omit it even when jsonMode
    // is set — the system prompt asks for JSON and callers parse it loosely
    // (stripping ```json fences / surrounding prose) downstream.
    return JSON.stringify({
      model: req.model ?? this.model,
      messages: this.buildMessages(req),
      stream,
      ...(req.temperature !== undefined
        ? { options: { temperature: req.temperature } }
        : {}),
    });
  }

  async complete(req: AiRequest): Promise<string> {
    const [status, bodyText] = await invoke<[number, string]>("local_http", {
      method: "POST",
      url: `${this.baseUrl}/api/chat`,
      headersJson: JSON.stringify({ "Content-Type": "application/json" }),
      body: this.buildBody(req, false),
    });

    if (status < 200 || status >= 300) {
      throw new Error(`Ollama request failed (HTTP ${status})`);
    }

    const data = JSON.parse(bodyText) as OllamaChatResponse;
    return data.message?.content ?? "";
  }

  /**
   * Extract assistant text from one or more NDJSON lines. Ollama streams one
   * JSON object per line; reasoning models (e.g. gemma) put chain-of-thought in
   * a separate `thinking` field and leave `content` empty until the final
   * answer — we surface ONLY `content`, never the raw line or the thinking.
   */
  private extractStreamContent(data: string): string {
    let out = "";
    for (const line of data.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed) as OllamaChatResponse;
        if (obj.message?.content) out += obj.message.content;
      } catch {
        // Ignore non-JSON / partial fragments.
      }
    }
    return out;
  }

  /**
   * True streaming via `local_http_stream`. Ollama emits NDJSON lines, each
   * `{ message: { content } }`; the Rust side forwards them as `chunk` events.
   * `signal` stops listening and resolves early with whatever has accumulated.
   */
  async stream(
    req: AiRequest,
    onToken: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> {
    if (signal.aborted) return "";

    const reqId = crypto.randomUUID();
    let accumulated = "";

    return new Promise<string>((resolve, reject) => {
      let unlisten: (() => void) | null = null;
      let settled = false;

      const cleanup = () => {
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
        signal.removeEventListener("abort", onAbort);
      };

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const onAbort = () => finish(() => resolve(accumulated));

      if (signal.aborted) {
        resolve(accumulated);
        return;
      }
      signal.addEventListener("abort", onAbort);

      listen<StreamEvent>(`local-stream://${reqId}`, (event) => {
        const payload = event.payload;
        if (payload.type === "chunk") {
          // payload.data is a raw NDJSON line — parse out the content token.
          const text = this.extractStreamContent(payload.data);
          if (text) {
            accumulated += text;
            if (!signal.aborted) onToken(text);
          }
        } else if (payload.type === "done") {
          finish(() => resolve(accumulated));
        } else if (payload.type === "error") {
          finish(() => reject(new Error(payload.message)));
        }
      })
        .then((un) => {
          unlisten = un;
          // If aborted while wiring up the listener, tear down immediately.
          if (signal.aborted) {
            finish(() => resolve(accumulated));
            return;
          }
          // Kick off the stream once the listener is in place.
          invoke("local_http_stream", {
            reqId,
            method: "POST",
            url: `${this.baseUrl}/api/chat`,
            headersJson: JSON.stringify({ "Content-Type": "application/json" }),
            body: this.buildBody(req, true),
          }).catch((err) => finish(() => reject(err as Error)));
        })
        .catch((err) => finish(() => reject(err as Error)));
    });
  }

  async healthCheck(): Promise<AiHealth> {
    try {
      const res = await invoke<LocalAiHealthResponse>("local_ai_health", {
        baseUrl: this.baseUrl,
      });
      const status: AiHealth["status"] =
        res.status === "healthy"
          ? "healthy"
          : res.status === "degraded"
            ? "degraded"
            : "unreachable";
      return {
        status,
        latencyMs: res.latencyMs,
        modelsAvailable: res.modelsAvailable,
      };
    } catch (err) {
      return {
        status: "unreachable",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
