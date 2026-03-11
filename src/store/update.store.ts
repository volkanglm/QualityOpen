import { create } from "zustand";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateStep = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateState {
  update: Update | null;
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
  step: "idle",
  progress: 0,
  error: null,
  dismissed: false,

  checkForUpdates: async (manual = false) => {
    set({ step: "checking", error: null, dismissed: false });
    try {
      const res = await check();
      if (res?.available) {
        set({ update: res, step: "available" });
      } else {
        set({ step: "idle", update: null });
        if (manual) {
            const { useToastStore } = await import("@/store/toast.store");
            // We can't use useT here, but we can push a generic message or handle it in the component
            useToastStore.getState().push("Up to date", "success");
        }
      }
    } catch (e: any) {
      console.error("Update check failed:", e);
      set({ step: "error", error: e.message || String(e) });
      if (manual) {
        const { useToastStore } = await import("@/store/toast.store");
        useToastStore.getState().push(`Update check failed: ${e.message || String(e)}`, "error");
      }
    }
  },

  downloadAndInstall: async () => {
    const { update } = get();
    if (!update) return;

    set({ step: "downloading", progress: 0 });
    let contentLength = 0;
    let downloaded = 0;

    try {
      await update.downloadAndInstall((e) => {
        switch (e.event) {
          case "Started":
            contentLength = e.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += e.data.chunkLength;
            if (contentLength > 0) {
              set({ progress: Math.round((downloaded / contentLength) * 100) });
            }
            break;
          case "Finished":
            set({ progress: 100 });
            break;
        }
      });
      set({ step: "ready" });
    } catch (e: any) {
      console.error("Update failed:", e);
      set({ step: "error", error: e.message || String(e) });
    }
  },

  restart: async () => {
    await relaunch();
  },

  setDismissed: (dismissed) => set({ dismissed }),
}));
