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

interface SyncManagerProps {
    open: boolean;
    onClose: () => void;
}

export function SyncManager({ open, onClose }: SyncManagerProps) {
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
            setError("Veriler karşılaştırılamadı.");
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
            setError("Senkronizasyon başarısız oldu.");
        } finally {
            setLoading(false);
        }
    };

    const driveTime = driveData?.exportedAt ? new Date(driveData.exportedAt).getTime() : 0;
    const localTime = localData?.exportedAt ? new Date(localData.exportedAt).getTime() : 0;
    const hasConflict = driveData && localData && Math.abs(driveTime - localTime) > 10000; // 10s difference

    return (
        <Modal open={open} onClose={onClose} title="Senkronizasyon Merkezi" width="600px">
            <div className="space-y-6 py-2">
                {/* Comparison View */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Cloud Side */}
                    <div className="rounded-[var(--radius-lg)] border p-4 flex flex-col items-center text-center gap-3 bg-[var(--bg-tertiary)]" style={{ borderColor: driveTime > localTime ? "var(--accent)" : "var(--border)" }}>
                        <Cloud className="h-8 w-8 text-[var(--text-muted)]" />
                        <div>
                            <p className="text-sm font-semibold">Google Drive</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                {driveData ? `Son güncelleme: ${new Date(driveData.exportedAt).toLocaleString()}` : "Veri bulunamadı"}
                            </p>
                        </div>
                    </div>

                    {/* Local Side */}
                    <div className="rounded-[var(--radius-lg)] border p-4 flex flex-col items-center text-center gap-3 bg-[var(--bg-tertiary)]" style={{ borderColor: localTime > driveTime ? "var(--accent)" : "var(--border)" }}>
                        <HardDrive className="h-8 w-8 text-[var(--text-muted)]" />
                        <div>
                            <p className="text-sm font-semibold">Yerel Bilgisayar</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                {localData ? `Son güncelleme: ${new Date(localData.exportedAt).toLocaleString()}` : "Veri bulunamadı"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conflict Warning */}
                {hasConflict && (
                    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--danger-subtle)] border border-[var(--danger-border)]">
                        <AlertTriangle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-[var(--danger)]">Sürüm Çakışması Tespit Edildi!</p>
                            <p className="text-[var(--danger)]/80">Bulut ve yerel veriler birbirinden farklı. Lütfen hangi sürümü korumak istediğinizi seçin. Bir yön seçtiğinizde diğer tarafın verisi üzerine yazılacaktır.</p>
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
                            <span>Bilgisayardakileri Buluta Yedekle</span>
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
                            <span>Buluttakileri Bilgisayara İndir</span>
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
                        Senkronizasyon tamamlandı
                    </div>
                )}
            </div>
        </Modal>
    );
}
