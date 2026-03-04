import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { activateLicense as apiActivateLicense } from "@/services/lemonSqueezy";

export type LicenseStatus = "idle" | "checking" | "active" | "inactive";

interface LicenseState {
  status: LicenseStatus;
  isPro: boolean;
  licenseKey: string | null;
  instanceId: string | null;
  lastVerifiedAt: number | null;
  modalOpen: boolean;
  error: string | null;
}

interface LicenseActions {
  checkLicense: () => Promise<void>;
  activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;
  openModal: () => void;
  closeModal: () => void;
  deactivateLicense: () => Promise<void>;
}

type LicenseStoreType = LicenseState & LicenseActions;

// Helper to get hardware/device ID. We'll use a local uuid or fallback string since Tauri 2 device ID varies
async function getDeviceHardwareId(): Promise<string> {
  const store = await load("qo_license.bin", { autoSave: true, defaults: {} });
  let hwId = await store.get<string>("instanceId");
  if (!hwId) {
    hwId = crypto.randomUUID();
    await store.set("instanceId", hwId);
    await store.save();
  }
  return hwId;
}

export const useLicenseStore = create<LicenseStoreType>()((set) => {
  const isDev = import.meta.env.DEV;
  const getStore = () => load("qo_license.bin", { autoSave: true, defaults: {} });

  return {
    status: isDev ? "active" : "idle",
    isPro: isDev ? true : false,
    licenseKey: isDev ? "DEV_MODE_ACTIVE" : null,
    instanceId: null,
    lastVerifiedAt: null,
    modalOpen: false,
    error: null,

    checkLicense: async () => {
      // GÜVENLİK NOTU: Bu blok sadece 'npm run tauri dev' modunda çalışır. 
      // Production build alındığında Vite bu kodu .exe/.dmg içinden tamamen silecektir (Dead code elimination).
      if (import.meta.env.DEV) {
        console.log("🛠️ DEV MODE: Pro özellikler test için kilitsiz.");
        set({ isPro: true, licenseKey: "DEV_MODE_ACTIVE", status: "active" });
        return;
      }
      set({ status: "checking" });
      try {
        const store = await getStore();
        const key = await store.get<string>("licenseKey");
        const instanceId = await getDeviceHardwareId();
        const lastVerifiedAt = await store.get<number>("lastVerifiedAt");

        if (key && instanceId) {
          // Attempt online verification quietly
          try {
            const res = await apiActivateLicense(key, instanceId);
            if (res.activated) {
              await store.set("lastVerifiedAt", Date.now());
              await store.save();
              set({
                status: "active",
                isPro: true,
                licenseKey: key,
                instanceId,
                lastVerifiedAt: Date.now()
              });
              return;
            }
          } catch (apiErr) {
            console.warn("Lemon Squeezy API unreachable, checking offline grace period...", apiErr);
          }

          // Fallback to offline verification
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          if (lastVerifiedAt && Date.now() - lastVerifiedAt < THIRTY_DAYS_MS) {
            console.log("Offline Pro mode activated based on recent verification.");
            set({
              status: "active",
              isPro: true,
              licenseKey: key,
              instanceId,
              lastVerifiedAt
            });
            return;
          }

          // If we reach here, either the key was deactivated upstream, or offline grace period expired
          set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
        } else {
          set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
        }
      } catch (e) {
        console.error("Failed to load license store", e);
        set({ status: "inactive", isPro: false });
      }
    },

    activateLicense: async (key: string) => {
      set({ error: null });
      try {
        const hwId = await getDeviceHardwareId();

        const res = await apiActivateLicense(key, hwId);

        if (res.activated && res.instance) {
          const store = await getStore();
          await store.set("licenseKey", key);
          await store.set("instanceId", res.instance.id);
          await store.set("lastVerifiedAt", Date.now());
          await store.save();

          set({
            status: "active",
            isPro: true,
            licenseKey: key,
            instanceId: res.instance.id,
            lastVerifiedAt: Date.now(),
            error: null,
            modalOpen: false,
          });
          return { success: true };
        } else {
          set({ error: res.error || "Geçersiz lisans anahtarı." });
          return { success: false, error: res.error || "Geçersiz lisans anahtarı." };
        }
      } catch (err: any) {
        set({ error: err.message || "Bilinmeyen bir hata oluştu." });
        return { success: false, error: err.message || "Bilinmeyen bir hata oluştu." };
      }
    },

    deactivateLicense: async () => {
      const store = await getStore();
      await store.delete("licenseKey");
      await store.delete("lastVerifiedAt");
      await store.save();
      set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
    },

    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
  };
});
