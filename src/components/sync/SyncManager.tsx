import { useState, useEffect } from "react";
import {
    ArrowRight,
    ArrowLeft,
    Cloud,
    HardDrive,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { listBackupFiles, downloadFile, pushLatestBackup } from "@/lib/drive";
import { syncDataToLocal } from "@/lib/localSync";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { useT } from "@/lib/i18n";

interface SyncManagerProps {
    open: boolean;
    onClose: () => void;
}

export function SyncManager({ open, onClose }: SyncManagerProps) {
    const t = useT();
    const { accessToken, localFolderPath } = useAuthStore();
    const { projects, documents, codes, segments, memos, importBackup } = useProjectStore();

    const [loading, setLoading] = useState(false);
    const [driveData, setDriveData] = useState<any>(null);
    const [localData, setLocalData] = useState<any>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    // Load latest data from both sides
    const loadComparison = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch from Drive
            if (accessToken) {
                const files = await listBackupFiles(accessToken);
                if (files.length > 0) {
                    const content = await downloadFile(accessToken, files[0].id);
                    setDriveData(JSON.parse(content));
                }
            }

            // 2. Fetch from Local Folder
            if (localFolderPath) {
                const path = `${localFolderPath}/latest_backup.json`;
                if (await exists(path)) {
                    const content = await readTextFile(path);
                    setLocalData(JSON.parse(content));
                }
            }
        } catch (err) {
            console.error("Comparison failed:", err);
            setError(t("settings.sync.compareError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) loadComparison();
    }, [open]);

    const handleSync = async (direction: "toDrive" | "toLocal") => {
        if (!accessToken && direction === "toDrive") return;
        setLoading(true);
        try {
            const currentPayload = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                projects, documents, codes, segments, memos
            };

            if (direction === "toDrive") {
                await pushLatestBackup(accessToken!, currentPayload);
                // Also sync to local if path exists to keep them in sync
                if (localFolderPath) await syncDataToLocal(localFolderPath, currentPayload);
            } else {
                // Pull from Drive and apply to app
                if (driveData) {
                    importBackup(driveData);
                    // Also update local folder with this drive data
                    if (localFolderPath) await syncDataToLocal(localFolderPath, driveData);
                }
            }
            setStatus("success");
            setTimeout(onClose, 2000);
        } catch (err) {
            setStatus("error");
            setError(t("settings.sync.error"));
        } finally {
            setLoading(false);
        }
    };

    const driveTime = driveData?.exportedAt ? new Date(driveData.exportedAt).getTime() : 0;
    const localTime = localData?.exportedAt ? new Date(localData.exportedAt).getTime() : 0;
    const hasConflict = driveData && localData && Math.abs(driveTime - localTime) > 10000; // 10s difference

    return (
        <Modal open={open} onClose={onClose} title={t("settings.sync.title")} width="600px">
            <div className="space-y-6 py-2">
                {/* Comparison View */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Cloud Side */}
                    <div className="rounded-[var(--radius-lg)] border p-4 flex flex-col items-center text-center gap-3 bg-[var(--bg-tertiary)]" style={{ borderColor: driveTime > localTime ? "var(--accent)" : "var(--border)" }}>
                        <Cloud className="h-8 w-8 text-[var(--text-muted)]" />
                        <div>
                            <p className="text-sm font-semibold">Google Drive</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                {driveData ? t("settings.sync.lastUpdate").replace("{date}", new Date(driveData.exportedAt).toLocaleString()) : t("settings.sync.noData")}
                            </p>
                        </div>
                    </div>

                    {/* Local Side */}
                    <div className="rounded-[var(--radius-lg)] border p-4 flex flex-col items-center text-center gap-3 bg-[var(--bg-tertiary)]" style={{ borderColor: localTime > driveTime ? "var(--accent)" : "var(--border)" }}>
                        <HardDrive className="h-8 w-8 text-[var(--text-muted)]" />
                        <div>
                            <p className="text-sm font-semibold">{t("welcome.localComputer") || "Local Computer"}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                {localData ? t("settings.sync.lastUpdate").replace("{date}", new Date(localData.exportedAt).toLocaleString()) : t("settings.sync.noData")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Login Prompt if not authenticated */}
                {!accessToken && (
                    <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-subtle)] gap-4">
                        <Cloud className="h-10 w-10 text-[var(--accent)] opacity-50" />
                        <div className="text-center">
                            <p className="text-sm font-semibold">{t("settings.sync.loginRequired") || "Google Drive Login Required"}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{t("settings.sync.loginDesc") || "Sign in to access your cloud backups and sync across devices."}</p>
                        </div>
                        <Button 
                            onClick={() => useAuthStore.getState().signIn()}
                            className="bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
                        >
                            {t("settings.sync.login") || "Sign in with Google"}
                        </Button>
                    </div>
                )}

                {/* Conflict Warning */}
                {accessToken && hasConflict && (
                    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--danger-subtle)] border border-[var(--danger-border)]">
                        <AlertTriangle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-[var(--danger)]">{t("settings.sync.conflict")}</p>
                            <p className="text-[var(--danger)]/80">{t("settings.sync.conflictDesc")}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                    <Button
                        className="w-full justify-between h-12 group"
                        variant="outline"
                        disabled={loading || !localFolderPath || !accessToken}
                        onClick={() => handleSync("toDrive")}
                    >
                        <div className="flex items-center gap-3 font-medium">
                            <HardDrive className="h-4 w-4" />
                            <span>{t("settings.sync.backupToDrive")}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>

                    <Button
                        className="w-full justify-between h-12 group"
                        variant="outline"
                        disabled={loading || !driveData || !accessToken}
                        onClick={() => handleSync("toLocal")}
                    >
                        <div className="flex items-center gap-3 font-medium">
                            <Cloud className="h-4 w-4" />
                            <span>{t("settings.sync.downloadFromDrive")}</span>
                        </div>
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </Button>
                </div>

                {error && (
                    <p className="text-xs text-center text-[var(--danger)]">{error}</p>
                )}

                {status === "success" && (
                    <div className="flex items-center justify-center gap-2 text-[var(--code-2)] text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("settings.sync.success")}
                    </div>
                )}
            </div>
        </Modal>
    );
}
