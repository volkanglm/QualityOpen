import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { 
  activateLicense as apiActivateLicense,
  deactivateLicense as apiDeactivateLicense,
  validateLicense as apiValidateLicense
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

const getDeviceHardwareId = async (): Promise<string> => {
    try {
        console.log("[License] Getting hardware ID...");
        // Await these calls to ensure they return the value, not a promise, 
        // especially on newer Tauri plugin versions where they might be async.
        const [a, p, t, v] = await Promise.all([
            arch(),
            platform(),
            type(),
            version()
        ]);
        const id = `${a}-${p}-${t}-${v}`;
        console.log(`[License] Hardware fingerprint: ${id}`);
        return id;
    } catch (e) {
        console.error("[License] Failed to get hardware ID:", e);
        return "unknown-hw-id";
    }
};


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



export const useLicenseStore = create<LicenseStoreType>()((set, get) => {
  const getLicenseStore = () => load("qo_license.bin", { autoSave: true, defaults: {} });

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
      if (import.meta.env.DEV) {
        console.log("🛠️ DEV MODE: Pro özellikler test için kilitsiz.");
        set({ isPro: true, licenseKey: "DEV_MODE_ACTIVE", status: "active" });
        return;
      }

      console.log("[License] Starting license check...");
      set({ status: "checking" });
      try {
        const store = await getLicenseStore();
        const key = await store.get<string>("licenseKey");
        const instanceId = await getDeviceHardwareId();
        const storeInstanceId = await store.get<string>("instanceId");
        const lastVerifiedAt = await store.get<number>("lastVerifiedAt");
        const storedHash = await store.get<string>("integrity");

        console.log(`[License] Found key: ${!!key}, last verified: ${lastVerifiedAt}`);

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
          // Attempt online verification quietly if it's been a while
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          const shouldCheckOnline = !lastVerifiedAt || (Date.now() - lastVerifiedAt > 24 * 60 * 60 * 1000);

          if (shouldCheckOnline) {
             console.log("[License] Verifying license online...");
             try {
               const res = storeInstanceId 
                 ? await apiValidateLicense(key, storeInstanceId)
                 : await apiActivateLicense(key, instanceId);

               if (res.activated) {
                 const now = Date.now();
                 await store.set("lastVerifiedAt", now);
                 if (res.instance && res.instance.id !== storeInstanceId) {
                   await store.set("instanceId", res.instance.id);
                 }
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
                 console.log("[License] Online verification successful.");
                 return;
               }
             } catch (apiErr) {
               console.warn("[License] Lemon Squeezy API unreachable, falling back to grace period.", apiErr);
             }
          }

          // Fallback to offline verification (grace period)
          if (lastVerifiedAt && Date.now() - lastVerifiedAt < SEVEN_DAYS_MS) {
            console.log("[License] Offline Pro mode active (grace period).");
            set({
              status: "active",
              isPro: true,
              licenseKey: key,
              instanceId,
              lastVerifiedAt
            });
            return;
          }

          console.warn("[License] License expired or deactivated.");
          set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
        } else {
          set({ status: "inactive", isPro: false, licenseKey: null, lastVerifiedAt: null });
        }
      } catch (e) {
        console.error("[License] Critical error in checkLicense:", e);
        set({ status: "inactive", isPro: false });
      }
    },

    activateLicense: async (key: string) => {
      set({ error: null });
      try {
        const hwId = await getDeviceHardwareId();
        const res = await apiActivateLicense(key, hwId);

        if (res.activated && res.instance) {
          const store = await getLicenseStore();
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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
        set({ error: errMsg });
        return { success: false, error: errMsg };
      }
    },

    deactivateLicense: async () => {
      const { licenseKey, instanceId } = get();
      
      if (!licenseKey || !instanceId) {
        const store = await getLicenseStore();
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
          const store = await getLicenseStore();
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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
        return { success: false, error: errMsg };
      }
    },

    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
  };
});
