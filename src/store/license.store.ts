import { create } from "zustand";
import { persist }  from "zustand/middleware";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db }                    from "@/lib/firebase";
import { validateLicenseKey }    from "@/lib/license";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LicenseStatus = "idle" | "checking" | "active" | "trial" | "inactive";

interface LicenseState {
  status:      LicenseStatus;
  licenseKey:  string | null;
  planName:    string | null;
  activatedAt: number | null;
  trialEnd:    number | null;        // null = no trial started
  modalOpen:   boolean;
  error:       string | null;
}

interface LicenseActions {
  checkLicense:     (uid: string)             => Promise<void>;
  activateLicense:  (uid: string, key: string) => Promise<{ success: boolean; error?: string }>;
  startTrial:       (uid: string)             => Promise<void>;
  openModal:        ()                         => void;
  closeModal:       ()                         => void;
}

type LicenseStore = LicenseState & LicenseActions;

// ─── Firestore path helper ────────────────────────────────────────────────────

const licenseRef = (uid: string) => doc(db, "users", uid, "data", "license");

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLicenseStore = create<LicenseStore>()(
  persist(
    (set, get) => ({
      // ── State ──
      status:      "idle",
      licenseKey:  null,
      planName:    null,
      activatedAt: null,
      trialEnd:    null,
      modalOpen:   false,
      error:       null,

      // ── Check existing license from Firestore ──
      async checkLicense(uid) {
        set({ status: "checking" });
        try {
          const snap = await getDoc(licenseRef(uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.status === "active") {
              set({
                status:      "active",
                licenseKey:  data.licenseKey ?? null,
                planName:    data.planName ?? "QualityOpen Pro",
                activatedAt: data.activatedAt?.toMillis?.() ?? Date.now(),
                modalOpen:   false,
              });
              return;
            }
            if (data.status === "trial") {
              const trialEnd = data.trialEnd?.toMillis?.() ?? 0;
              if (trialEnd > Date.now()) {
                set({ status: "trial", trialEnd, modalOpen: false });
                return;
              }
            }
          }
          // No valid license → show modal
          set({ status: "inactive", modalOpen: true });
        } catch {
          // Firestore unreachable (offline) → check local state
          const local = get();
          if (local.status === "active" || local.status === "trial") {
            set({ modalOpen: false });
          } else {
            set({ status: "inactive", modalOpen: true });
          }
        }
      },

      // ── Activate via license key ──
      async activateLicense(uid, key) {
        set({ error: null });
        const result = await validateLicenseKey(key);
        if (!result.valid) {
          const errMsg = result.error ?? "Geçersiz lisans anahtarı.";
          set({ error: errMsg });
          return { success: false, error: errMsg };
        }

        const nowMs = Date.now();
        // Persist to Firestore
        try {
          await setDoc(licenseRef(uid), {
            status:      "active",
            licenseKey:  key.trim(),
            planName:    result.planName ?? "QualityOpen Pro",
            activatedAt: serverTimestamp(),
          }, { merge: true });
        } catch {
          // Firestore write failed (offline) — store locally only
        }

        set({
          status:      "active",
          licenseKey:  key.trim(),
          planName:    result.planName ?? "QualityOpen Pro",
          activatedAt: nowMs,
          modalOpen:   false,
          error:       null,
        });
        return { success: true };
      },

      // ── 14-day trial ──
      async startTrial(uid) {
        const trialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
        try {
          await setDoc(licenseRef(uid), {
            status:   "trial",
            trialEnd: new Date(trialEnd),
          }, { merge: true });
        } catch {
          // offline — local only
        }
        set({ status: "trial", trialEnd, modalOpen: false, error: null });
      },

      openModal:  () => set({ modalOpen: true }),
      closeModal: () => set({ modalOpen: false }),
    }),
    {
      name:      "qo_license",
      partialize: (s) => ({
        status:      s.status,
        licenseKey:  s.licenseKey,
        planName:    s.planName,
        activatedAt: s.activatedAt,
        trialEnd:    s.trialEnd,
      }),
    },
  ),
);
