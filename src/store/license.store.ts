import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { 
  activateLicense as apiActivateLicense,
  deactivateLicense as apiDeactivateLicense
} from "@/services/lemonSqueezy";
import { arch, platform, type, version } from '@tauri-apps/plugin-os';

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
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>;
}

type LicenseStoreType = LicenseState & LicenseActions;

async function getDeviceHardwareId(): Promise<string> {
  const rawString = `${arch()}-${platform()}-${type()}-${version()}`;
  const data = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


/**
 * Generates a HMAC-like integrity hash of the license data
 * to detect manual editing of the JSON file.
 */
async function generateIntegrityHash(data: { key: string | null, verifiedAt: number | null }): Promise<string> {
  const hwId = await getDeviceHardwareId();
  const payload = `${data.key ?? "NONE"}|${data.verifiedAt ?? 0}|${hwId}`;
  const encoder = new TextEncoder();

  // CRIT-02: Use a dynamic secret with a frontend pepper
  const HMAC_SECRET = "QO_CORE_PEPPER_" + hwId;
  const keyData = encoder.encode(HMAC_SECRET);
  const msgData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const useLicenseStore = create<LicenseStoreType>()((set) => {
  const getStore = () => load("qo_license.bin", { autoSave: true, defaults: {} });

  return {
    status: "idle",
    isPro: false,
    licenseKey: null,
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
        const storedHash = await store.get<string>("integrity");

        // CRIT-01: Integrity check is MANDATORY if a key exists
        if (key) {
          if (!storedHash) {
            console.error("🛑 License integrity check FAILED: hash missing!");
            set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
            await store.clear();
            await store.save();
            return;
          }
          const currentHash = await generateIntegrityHash({ key, verifiedAt: lastVerifiedAt ?? null });
          if (storedHash !== currentHash) {
            console.error("🛑 License integrity check FAILED: hash mismatch!");
            set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
            await store.clear();
            await store.save();
            return;
          }
        }

        if (key && instanceId) {
          // Attempt online verification quietly
          try {
            const res = await apiActivateLicense(key, instanceId);
            if (res.activated) {
              const now = Date.now();
              await store.set("lastVerifiedAt", now);
              const integrity = await generateIntegrityHash({ key, verifiedAt: now });
              await store.set("integrity", integrity);
              await store.save();
              set({
                status: "active",
                isPro: true,
                licenseKey: key,
                instanceId,
                lastVerifiedAt: now
              });
              return;
            }
          } catch (apiErr) {
            console.warn("Lemon Squeezy API unreachable, checking offline grace period...", apiErr);
          }

          // Fallback to offline verification
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          if (lastVerifiedAt && Date.now() - lastVerifiedAt < SEVEN_DAYS_MS) {
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
          const now = Date.now();
          await store.set("licenseKey", key);
          await store.set("instanceId", res.instance.id);
          await store.set("lastVerifiedAt", now);

          const integrity = await generateIntegrityHash({
            key,
            verifiedAt: now,
          });
          await store.set("integrity", integrity);
          await store.save();

          set({
            status: "active",
            isPro: true,
            licenseKey: key,
            instanceId: res.instance.id,
            lastVerifiedAt: now,
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
      const { licenseKey, instanceId } = useLicenseStore.getState();
      
      // If no key or instance, just clear local (shouldn't happen if PRO is active)
      if (!licenseKey || !instanceId) {
        const store = await getStore();
        await store.delete("licenseKey");
        await store.delete("instanceId");
        await store.delete("lastVerifiedAt");
        await store.delete("integrity");
        await store.save();
        set({ status: "inactive", isPro: false, licenseKey: null, instanceId: null, lastVerifiedAt: null });
        return { success: true };
      }

      try {
        const res = await apiDeactivateLicense(licenseKey, instanceId);
        
        if (res.success) {
          const store = await getStore();
          await store.delete("licenseKey");
          await store.delete("instanceId");
          await store.delete("lastVerifiedAt");
          await store.delete("integrity");
          await store.save();
          set({ status: "inactive", isPro: false, licenseKey: null, instanceId: null, lastVerifiedAt: null });
          return { success: true };
        } else {
          return { success: false, error: res.error || "Deaktivasyon işlemi başarısız oldu." };
        }
      } catch (err: any) {
        return { success: false, error: err.message || "Bilinmeyen bir hata oluştu." };
      }
    },

    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
  };
});
