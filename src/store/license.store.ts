import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { activateLicense as apiActivateLicense } from "@/services/lemonSqueezy";

export type LicenseStatus = "idle" | "checking" | "active" | "inactive";

interface LicenseState {
  status: LicenseStatus;
  isPro: boolean;
  licenseKey: string | null;
  deviceToken: string | null;
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
  const store = await load("qo_settings.bin", { autoSave: true, defaults: {} });
  let hwId = await store.get<string>("hardwareId");
  if (!hwId) {
    hwId = crypto.randomUUID();
    await store.set("hardwareId", hwId);
    await store.save();
  }
  return hwId;
}

export const useLicenseStore = create<LicenseStoreType>()((set) => {
  const getStore = () => load("qo_license.bin", { autoSave: true, defaults: {} });

  return {
    status: import.meta.env.DEV ? "active" : "idle",
    isPro: import.meta.env.DEV ? true : false,
    licenseKey: null,
    deviceToken: null,
    modalOpen: false,
    error: null,

    checkLicense: async () => {
      set({ status: "checking" });
      try {
        const store = await getStore();
        const key = await store.get<string>("licenseKey");
        const token = await store.get<string>("deviceToken");

        if (key && token) {
          set({
            status: "active",
            isPro: true,
            licenseKey: key,
            deviceToken: token,
          });
        } else {
          set({ status: import.meta.env.DEV ? "active" : "inactive", isPro: import.meta.env.DEV ? true : false });
        }
      } catch (e) {
        console.error("Failed to load license store", e);
        set({ status: import.meta.env.DEV ? "active" : "inactive", isPro: import.meta.env.DEV ? true : false });
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
          await store.set("deviceToken", res.instance.id);
          await store.save();

          set({
            status: "active",
            isPro: true,
            licenseKey: key,
            deviceToken: res.instance.id,
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
      await store.delete("deviceToken");
      await store.save();
      set({ status: import.meta.env.DEV ? "active" : "inactive", isPro: import.meta.env.DEV ? true : false, licenseKey: null, deviceToken: null });
    },

    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
  };
});
