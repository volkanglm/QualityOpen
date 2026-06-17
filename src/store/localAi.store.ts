import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/store/settings.store";

/**
 * Local-LLM (Ollama) health monitoring store.
 *
 * Holds the latest reachability/latency snapshot for the configured Ollama
 * endpoint plus a lightweight polling loop. The poll interval id is kept in a
 * module-level variable (NOT in zustand state) so the store stays serializable
 * and free of non-plain values. This store is intentionally NOT persisted.
 */

export type LocalAiStatus = "healthy" | "degraded" | "unreachable" | "unknown";

/** Shape returned by the `local_ai_health` Tauri command. */
interface LocalAiHealthResult {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs: number;
  modelsAvailable: string[];
}

interface LocalAiStore {
  /** Last known reachability of the Ollama endpoint. */
  status: LocalAiStatus;
  /** Round-trip latency of the last successful probe, in ms (null if unknown). */
  latencyMs: number | null;
  /** Model tags reported by Ollama (`/api/tags`), empty when unreachable. */
  modelsAvailable: string[];
  /** Epoch ms of the last completed health check (null if never checked). */
  lastChecked: number | null;
  /** True while the polling loop is active. */
  isPolling: boolean;

  /** Probe the endpoint once and update state. Never throws. */
  checkHealth: () => Promise<void>;
  /** Immediate check, then poll every `intervalMs`. Idempotent. */
  startPolling: (intervalMs?: number) => void;
  /** Stop the polling loop. */
  stopPolling: () => void;
}

// Module-level interval handle — kept out of zustand state to keep it serializable.
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useLocalAiStore = create<LocalAiStore>()((set, get) => ({
  status: "unknown",
  latencyMs: null,
  modelsAvailable: [],
  lastChecked: null,
  isPolling: false,

  checkHealth: async () => {
    const baseUrl = useSettingsStore.getState().ollamaBaseUrl;
    try {
      const result = await invoke<LocalAiHealthResult>("local_ai_health", { baseUrl });
      set({
        status: result.status,
        latencyMs: result.latencyMs,
        modelsAvailable: result.modelsAvailable ?? [],
        lastChecked: Date.now(),
      });
    } catch {
      // Endpoint down / command failed — treat as unreachable, never throw.
      set({
        status: "unreachable",
        latencyMs: null,
        modelsAvailable: [],
        lastChecked: Date.now(),
      });
    }
  },

  startPolling: (intervalMs = 10_000) => {
    // Guard against double-start.
    if (get().isPolling || pollTimer !== null) return;

    set({ isPolling: true });
    // Fire an immediate check so the UI is not stuck on "unknown".
    void get().checkHealth();
    pollTimer = setInterval(() => {
      void get().checkHealth();
    }, intervalMs);
  },

  stopPolling: () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({ isPolling: false });
  },
}));
