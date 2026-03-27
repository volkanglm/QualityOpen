import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { 
  activateLicense as apiActivateLicense,
  deactivateLicense as apiDeactivateLicense,
  validateLicense as apiValidateLicense
} from "@/services/lemonSqueezy";

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

const SERVICE = "qualityopen";

// Keychain Helper Wrappers
const kwSet = (key: string, value: string) => invoke("keyring_set", { service: SERVICE, key, value });
const kwGet = (key: string) => invoke<string | null>("keyring_get", { service: SERVICE, key });
const kwDel = (key: string) => invoke("keyring_delete", { service: SERVICE, key });

/**
 * Gets or creates a stable Machine UUID stored in the OS Keychain.
 * This survives app updates, unlike the previous weak hash.
 */
async function getPersistentMachineId(): Promise<string> {
  try {
    let id = await kwGet("machine_id");
    if (!id) {
      id = crypto.randomUUID();
      await kwSet("machine_id", id);
      console.log("[License] Generated new stable machine ID:", id);
    }
    return id;
  } catch (e) {
    console.error("[License] Failed to handle stable machine ID:", e);
    return "legacy-hw-id";
  }
}

export const useLicenseStore = create<LicenseStoreType>()((set, get) => {
  return {
    status: "idle",
    isPro: false,
    licenseKey: null,
    instanceId: null,
    lastVerifiedAt: null,
    modalOpen: false,
    error: null,

    checkLicense: async () => {
      // DEV MODE: Unlocks pro features for testing
      if (import.meta.env.DEV) {
        console.log("🛠️ DEV MODE: Pro features unlocked.");
        set({ isPro: true, licenseKey: "DEV_MODE_ACTIVE", status: "active" });
        return;
      }

      console.log("[License] Starting license check via Keychain...");
      set({ status: "checking" });
      
      try {
        // 1. Load from Keychain
        let key = await kwGet("license_key");
        let instanceId = await kwGet("instance_id");
        let lastVerifiedStr = await kwGet("last_verified_at");
        let lastVerifiedAt = lastVerifiedStr ? parseInt(lastVerifiedStr, 10) : null;
        
        const machineUuid = await getPersistentMachineId();

        // 2. Migration Logic (one-time move from qo_license.bin to Keychain)
        if (!key) {
           try {
             const store = await load("qo_license.bin", { autoSave: false });
             const oldKey = await store.get<string>("licenseKey");
             if (oldKey) {
                console.log("[License] Migrating old license from file to Keychain...");
                key = oldKey;
                instanceId = await store.get<string>("instanceId");
                lastVerifiedAt = await store.get<number>("lastVerifiedAt");
                
                if (key) await kwSet("license_key", key);
                if (instanceId) await kwSet("instance_id", instanceId);
                if (lastVerifiedAt) await kwSet("last_verified_at", lastVerifiedAt.toString());
                
                // Clear old store to avoid redundant migration
                await store.clear();
                await store.save();
             }
           } catch (migErr) {
             console.debug("[License] No legacy store found or migration failed:", migErr);
           }
        }

        if (key && instanceId && machineUuid) {
          const PANIC_DAYS_MS = 14 * 24 * 60 * 60 * 1000; // Hard lockout after 14 days
          const RECHECK_DAYS_MS = 24 * 60 * 60 * 1000;    // Silently re-verify every 24h
          
          const now = Date.now();
          const timeSinceLastCheck = lastVerifiedAt ? now - lastVerifiedAt : Infinity;

          if (timeSinceLastCheck > RECHECK_DAYS_MS) {
            console.log("[License] Re-verifying license with Lemon Squeezy...");
            try {
              const res = await apiValidateLicense(key, instanceId);
              if (res.activated) {
                await kwSet("last_verified_at", now.toString());
                set({
                  status: "active",
                  isPro: true,
                  licenseKey: key,
                  instanceId,
                  lastVerifiedAt: now
                });
                return;
              } else {
                console.warn("[License] Validation failed:", res.error);
              }
            } catch (err) {
              console.warn("[License] LS API unreachable, checking grace period.");
            }
          }

          // Grace period check
          if (lastVerifiedAt && timeSinceLastCheck < PANIC_DAYS_MS) {
            console.log("[License] Offline Pro mode active (Grace period).");
            set({
              status: "active",
              isPro: true,
              licenseKey: key,
              instanceId,
              lastVerifiedAt
            });
            return;
          }
        }
        
        // No valid license found or expired
        set({ status: "inactive", isPro: false, licenseKey: null, instanceId: null, lastVerifiedAt: null });
      } catch (e) {
        console.error("[License] Critical error in checkLicense:", e);
        set({ status: "inactive", isPro: false });
      }
    },

    activateLicense: async (key: string) => {
      set({ error: null });
      try {
        const machineUuid = await getPersistentMachineId();
        // LS uses instance_name for activation (descriptive)
        const res = await apiActivateLicense(key, machineUuid);

        if (res.activated && res.instance) {
          const now = Date.now();
          await kwSet("license_key", key);
          await kwSet("instance_id", res.instance.id);
          await kwSet("last_verified_at", now.toString());

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
        await kwDel("license_key");
        await kwDel("instance_id");
        await kwDel("last_verified_at");
        set({ status: "inactive", isPro: false, licenseKey: null, instanceId: null, lastVerifiedAt: null });
        return { success: true };
      }

      try {
        const res = await apiDeactivateLicense(licenseKey, instanceId);
        
        if (res.success) {
          await kwDel("license_key");
          await kwDel("instance_id");
          await kwDel("last_verified_at");
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
