import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pushLatestBackup, pushScheduledBackup, getLatestBackupModifiedTime, DriveError } from "@/lib/drive";
import { writeSnapshotToDb } from "@/lib/db";
import type { SyncState, SyncStatus, BackupSchedule } from "@/types";

// ─── Schedule intervals in ms ─────────────────────────────────────────────────
const SCHEDULE_MS: Record<BackupSchedule, number> = {
  manual:  Infinity,
  daily:   86_400_000,
  weekly:  604_800_000,
  monthly: 2_592_000_000,
};

// ─── Store interface ──────────────────────────────────────────────────────────

interface SyncStore extends SyncState {
  syncNow:           (token: string, force?: boolean) => Promise<void>;
  backupNow:         (token: string) => Promise<void>;
  setSchedule:       (s: BackupSchedule) => void;
  checkSchedule:     (token: string) => Promise<void>;
  resetDrive:        () => void;
  _setStatus:        (s: SyncStatus, error?: string) => void;
  /** True when remote is newer than local and user hasn't decided yet */
  conflictPending:   boolean;
  resolveConflict:   (choice: "overwrite" | "download") => Promise<void>;
  _conflictToken:    string | null;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      status:           "idle",
      driveDisabled:    false,
      lastSyncAt:       null,
      lastBackupAt:     null,
      backupSchedule:   "daily",
      errorMessage:     null,
      driveFolderId:    null,
      conflictPending:  false,
      _conflictToken:   null,

      _setStatus: (status, errorMessage = undefined) =>
        set({ status, errorMessage }),

      setSchedule:  (schedule) => set({ backupSchedule: schedule }),
      resetDrive:   ()         => set({ driveDisabled: false }),

      syncNow: async (token, force = false) => {
        const { _setStatus, lastSyncAt } = get();
        _setStatus("syncing");
        try {
          // 1. Read current app data from Zustand (imported lazily to avoid circular deps)
          const { useProjectStore } = await import("@/store/project.store");
          const { projects, documents, codes, segments, memos } =
            useProjectStore.getState();

          const payload = {
            version:    "1.0",
            exportedAt: new Date().toISOString(),
            projects,
            documents,
            codes,
            segments,
            memos,
          };

          // 2. Write to IndexedDB first (offline-first)
          await writeSnapshotToDb({ projects, documents, codes, segments, memos });

          // 3. Conflict detection: check if remote is newer than our last sync
          if (!force && lastSyncAt) {
            const remoteModified = await getLatestBackupModifiedTime(token);
            if (remoteModified && remoteModified.getTime() > lastSyncAt) {
              // Remote is newer — pause and ask user
              set({ status: "idle", conflictPending: true, _conflictToken: token });
              return;
            }
          }

          // 4. Push to Google Drive
          await pushLatestBackup(token, payload);

          set({ status: "success", lastSyncAt: Date.now(), errorMessage: null, conflictPending: false });

          // Auto-reset to idle after 3 seconds
          setTimeout(() => {
            if (useSyncStore.getState().status === "success") {
              set({ status: "idle" });
            }
          }, 3000);
        } catch (err) {
          // 401/403 = Drive API not enabled or token lacks drive.file scope
          // Local (IndexedDB) snapshot was already saved above — treat as success
          if (err instanceof DriveError && (err.statusCode === 401 || err.statusCode === 403)) {
            set({ status: "idle", lastSyncAt: Date.now(), errorMessage: null, driveDisabled: true });
            return;
          }
          const msg =
            err instanceof DriveError
              ? `Drive error ${err.statusCode}`
              : err instanceof Error
              ? err.message
              : "Sync failed";
          _setStatus("error", msg);
        }
      },

      resolveConflict: async (choice) => {
        const { _conflictToken } = get();
        if (!_conflictToken) return;
        set({ conflictPending: false });

        if (choice === "overwrite") {
          // User chose to push local data, ignoring remote
          await useSyncStore.getState().syncNow(_conflictToken, true);
        } else {
          // User chose to download remote — import it
          try {
            const { downloadFile, ensureRootFolder } = await import("@/lib/drive");
            // Find the file id
            const API_BASE = "https://www.googleapis.com/drive/v3";
            const folderId = await ensureRootFolder(_conflictToken);
            const q = encodeURIComponent(`name='latest_backup.json' and '${folderId}' in parents and trashed=false`);
            const { nativeHttp: nh } = await import("@/lib/nativeHttp");
            const res = await nh(`${API_BASE}/files?q=${q}&fields=files(id)&spaces=drive`, {
              method: "GET",
              headers: { Authorization: `Bearer ${_conflictToken}` },
            });
            const data = JSON.parse(res.body) as { files: { id: string }[] };
            const fileId = data.files?.[0]?.id;
            if (!fileId) return;
            const json = await downloadFile(_conflictToken, fileId);
            const payload = JSON.parse(json);
            const { useProjectStore } = await import("@/store/project.store");
            useProjectStore.getState().importBackup(payload);
            set({ lastSyncAt: Date.now() });
          } catch (e) {
            console.error("[Sync] Failed to download remote version:", e);
          }
        }
        set({ _conflictToken: null });
      },

      backupNow: async (token) => {
        const { _setStatus } = get();
        _setStatus("syncing");
        try {
          const { useProjectStore } = await import("@/store/project.store");
          const { projects, documents, codes, segments, memos } =
            useProjectStore.getState();

          const payload = {
            version:    "1.0",
            exportedAt: new Date().toISOString(),
            projects,
            documents,
            codes,
            segments,
            memos,
          };

          await writeSnapshotToDb({ projects, documents, codes, segments, memos });
          await pushScheduledBackup(token, payload);

          set({ status: "success", lastBackupAt: Date.now(), errorMessage: null });

          setTimeout(() => {
            if (useSyncStore.getState().status === "success") {
              set({ status: "idle" });
            }
          }, 3000);
        } catch (err) {
          if (err instanceof DriveError && (err.statusCode === 401 || err.statusCode === 403)) {
            set({ status: "idle", lastBackupAt: Date.now(), errorMessage: null, driveDisabled: true });
            return;
          }
          const msg =
            err instanceof DriveError
              ? `Drive error ${err.statusCode}`
              : err instanceof Error
              ? err.message
              : "Backup failed";
          _setStatus("error", msg);
        }
      },

      checkSchedule: async (token) => {
        const { backupSchedule, lastBackupAt, backupNow } = get();
        if (backupSchedule === "manual") return;
        const intervalMs = SCHEDULE_MS[backupSchedule];
        const now        = Date.now();
        const last       = lastBackupAt ?? 0;
        if (now - last >= intervalMs) {
          await backupNow(token);
        }
      },
    }),
    {
      name: "qo-sync-state",
      // Only persist these keys — not transient status
      partialize: (s) => ({
        lastSyncAt:     s.lastSyncAt,
        lastBackupAt:   s.lastBackupAt,
        backupSchedule: s.backupSchedule,
        driveFolderId:  s.driveFolderId,
        driveDisabled:  s.driveDisabled,
        // conflictPending & _conflictToken are intentionally NOT persisted
      }),
    }
  )
);
