import { create } from "zustand";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateStep = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateState {
  update: Update | null;
  latestVersion: string | null;
  step: UpdateStep;
  progress: number;
  error: string | null;
  dismissed: boolean;

  checkForUpdates: (manual?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  restart: () => Promise<void>;
  setDismissed: (dismissed: boolean) => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  update: null,
  latestVersion: null,
  step: "idle",
  progress: 0,
  error: null,
  dismissed: false,

  checkForUpdates: async (manual = false) => {
    set({ step: "checking", error: null, dismissed: false });
    try {
      const res = await check();
      if (res?.available) {
        set({ update: res, latestVersion: res.version ?? null, step: "available" });
      } else {
        set({ step: "idle", update: null, latestVersion: null });
        if (manual) {
          const { useToastStore } = await import("@/store/toast.store");
          useToastStore.getState().push("Up to date", "success");
        }
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[Updater] Check failed:", e);
      set({ step: "error", error: errMsg });
      if (manual) {
        const { useToastStore } = await import("@/store/toast.store");
        useToastStore.getState().push(`Update check failed: ${errMsg}`, "error");
      }
    }
  },

  downloadAndInstall: async () => {
    const { update } = get();
    if (!update) return;

    set({ step: "downloading", progress: 0 });
    let downloaded = 0;
    let total = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          set({ progress: pct });
        } else if (event.event === "Finished") {
          set({ step: "ready", progress: 100 });
        }
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[Updater] Download failed:", e);
      set({ step: "error", error: errMsg });
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(`Download failed: ${errMsg}`, "error");
    }
  },

  restart: async () => {
    await relaunch();
  },

  setDismissed: (dismissed) => set({ dismissed }),
}));
