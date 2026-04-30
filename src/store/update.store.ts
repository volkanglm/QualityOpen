import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";

const GITHUB_REPO = "volkanglm/QualityOpen";
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

type UpdateStep = "idle" | "checking" | "available" | "error";

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
}

interface UpdateState {
  latestVersion: string | null;
  currentVersion: string | null;
  releaseUrl: string | null;
  step: UpdateStep;
  error: string | null;
  dismissed: boolean;

  checkForUpdates: (manual?: boolean) => Promise<void>;
  openReleasePage: () => Promise<void>;
  setDismissed: (dismissed: boolean) => void;
}

function compareVersions(a: string, b: string): number {
  const cleanA = a.replace(/^v/, "");
  const cleanB = b.replace(/^v/, "");
  const partsA = cleanA.split(".").map(Number);
  const partsB = cleanB.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pa = partsA[i] || 0;
    const pb = partsB[i] || 0;
    if (pa > pb) return 1;
    if (pa < pb) return -1;
  }
  return 0;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  latestVersion: null,
  currentVersion: null,
  releaseUrl: null,
  step: "idle",
  error: null,
  dismissed: false,

  checkForUpdates: async (manual = false) => {
    set({ step: "checking", error: null, dismissed: false });
    try {
      const current = await getVersion();
      const response = await fetch(API_URL, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "QualityOpen-Updater",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latest = release.tag_name;
      const isNewer = compareVersions(latest, current) > 0;

      if (isNewer) {
        set({
          latestVersion: latest,
          currentVersion: current,
          releaseUrl: release.html_url,
          step: "available",
        });
      } else {
        set({ step: "idle", latestVersion: null, releaseUrl: null });
        if (manual) {
          const { useToastStore } = await import("@/store/toast.store");
          useToastStore.getState().push("Up to date", "success");
        }
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("Update check failed:", e);
      set({ step: "error", error: errMsg });
      if (manual) {
        const { useToastStore } = await import("@/store/toast.store");
        useToastStore.getState().push(`Update check failed: ${errMsg}`, "error");
      }
    }
  },

  openReleasePage: async () => {
    const { releaseUrl } = get();
    const url = releaseUrl || RELEASES_URL;
    await openUrl(url);
  },

  setDismissed: (dismissed) => set({ dismissed }),
}));
