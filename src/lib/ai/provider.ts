// ─── AI Provider Abstraction ────────────────────────────────────────────────
//
// Core interfaces for the pluggable AI layer. Cloud (BYOK: OpenAI / Anthropic /
// Gemini) and local (Ollama) providers all implement `AiProvider`, so call
// sites can treat them interchangeably.
//
// This file imports ONLY the existing `Message` type from `@/lib/ai`. It does
// NOT import the settings store — the registry is fed a plain
// `ActiveProviderConfig` so it stays pure and testable.

import type { Message } from "@/lib/ai";

/** Discriminator for every supported backend. */
export type AiProviderType = "openai" | "anthropic" | "gemini" | "ollama";

/**
 * A single completion request, normalized across providers.
 * `messages` + `systemPrompt` mirror the existing `askAi()` signature.
 */
export interface AiRequest {
  messages: Message[];
  systemPrompt: string;
  /** Hint the provider to emit strict JSON (used by thematic coding). */
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Override the provider's default model. */
  model?: string;
}

/** Result of a lightweight provider health probe. */
export interface AiHealth {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  modelsAvailable?: string[];
  message?: string;
}

/**
 * The uniform contract every backend implements. Construct concrete providers
 * via `resolveProvider()` in `providerRegistry.ts` — do not instantiate the
 * classes directly from call sites.
 */
export interface AiProvider {
  readonly type: AiProviderType;
  /** True for on-device backends (Ollama). Cloud providers are false. */
  readonly isLocal: boolean;
  /** Human-readable label for UI surfaces. */
  readonly displayName: string;

  /** Non-streaming completion. Returns the full assistant text. */
  complete(req: AiRequest): Promise<string>;

  /**
   * Streaming completion. Calls `onToken` for each incremental chunk and
   * resolves with the fully accumulated text. `signal` aborts the stream.
   */
  stream(
    req: AiRequest,
    onToken: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string>;

  /** Lightweight reachability / readiness probe. */
  healthCheck(): Promise<AiHealth>;
}

/**
 * Pure input the registry needs to build a provider.
 *
 * IMPORTANT: this is a plain data object — NO settings-store import here. The
 * settings store should expose a selector that produces one of these (see the
 * integration guide), keeping `providerRegistry.ts` free of store coupling.
 */
export interface ActiveProviderConfig {
  type: AiProviderType;
  /** Cloud only — BYOK key. Null/undefined for local providers. */
  apiKey?: string | null;
  /** Local only — e.g. "http://127.0.0.1:11434". */
  ollamaBaseUrl?: string;
  /** Local only — e.g. "llama3.1:8b". */
  ollamaModel?: string;
}
