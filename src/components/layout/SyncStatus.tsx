import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Check, AlertCircle, LogOut, RefreshCw, LogIn } from "lucide-react";
import { useSyncStore } from "@/store/sync.store";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import type { BackupSchedule } from "@/types";


export function SyncStatus() {
  const { status, lastSyncAt, lastBackupAt, backupSchedule, errorMessage, driveDisabled,
    syncNow, backupNow, setSchedule, resetDrive } =
    useSyncStore();
  const { accessToken, user, signOut, signIn, loading: authLoading } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const triggerSync = async () => {
    if (!accessToken || isSyncing) return;
    setIsSyncing(true);
    await syncNow(accessToken);
    setIsSyncing(false);
  };

  const triggerBackup = async () => {
    if (!accessToken) return;
    setMenuOpen(false);
    await backupNow(accessToken);
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return "Hiç";
    const diff = Date.now() - ts;
    if (diff < 60_000) return "Az önce";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}d önce`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}s önce`;
    return new Date(ts).toLocaleDateString("tr-TR");
  };

  return (
    <div ref={menuRef} className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* ── Settings menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="rounded-[var(--radius-lg)] border p-4 w-60"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              boxShadow: "var(--float-shadow)",
            }}
          >
            {/* License Status / Upgrade */}
            {!useLicenseStore.getState().isPro && (
              <div className="mb-3 pb-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center gap-2 text-[12px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none text-white shadow-md shadow-blue-900/20"
                  onClick={() => { setMenuOpen(false); useLicenseStore.getState().openModal(); }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  QualityOpen Pro'yu Etkinleştir
                </Button>
              </div>
            )}

            {/* User profile — or sign-in prompt */}
            {user ? (
              <div className="flex items-center gap-2.5 mb-3 pb-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ""}
                    className="h-7 w-7 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--surface-active)", color: "var(--text-secondary)" }}
                  >
                    {user.displayName?.[0] ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {user.displayName ?? user.email}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-3 pb-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2 text-[12px]"
                  disabled={authLoading}
                  onClick={() => { setMenuOpen(false); void signIn(); }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {authLoading ? "Giriş yapılıyor…" : "Google ile Giriş Yap"}
                </Button>
              </div>
            )}

            {/* Error message */}
            {status === "error" && errorMessage && (
              <div
                className="mb-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-[11px] leading-relaxed"
                style={{
                  background: "var(--danger-subtle)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  color: "var(--danger)",
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Drive disabled warning */}
            {driveDisabled && (
              <div
                className="mb-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-[11px] leading-relaxed space-y-1.5"
                style={{
                  background: "rgba(252,163,17,0.08)",
                  border: "1px solid rgba(252,163,17,0.25)",
                  color: "#fca319",
                }}
              >
                <p>Google Drive API etkin değil veya izin eksik. Veriler yalnızca yerel olarak kaydediliyor.</p>
                <button
                  className="underline text-[10px] opacity-80 hover:opacity-100"
                  onClick={() => { resetDrive(); setMenuOpen(false); }}
                >
                  Yeniden dene
                </button>
              </div>
            )}

            {/* No token warning */}
            {!accessToken && !driveDisabled && (
              <div
                className="mb-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-[11px] leading-relaxed"
                style={{
                  background: "rgba(252, 163, 17, 0.08)",
                  border: "1px solid rgba(252, 163, 17, 0.25)",
                  color: "#fca319",
                }}
              >
                Drive yedeği için yeniden giriş yapın.
              </div>
            )}

            {/* Sync stats */}
            <div className="space-y-1 mb-3">
              <InfoRow label="Son senkronizasyon" value={formatTime(lastSyncAt)} />
              <InfoRow label="Son yedek" value={formatTime(lastBackupAt)} />
            </div>

            {/* Schedule selector */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                Otomatik yedekleme
              </p>
              <div className="grid grid-cols-2 gap-1">
                {(["manual", "daily", "weekly", "monthly"] as BackupSchedule[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSchedule(s)}
                    className="rounded-[var(--radius-sm)] py-1.5 px-2 text-[11px] font-medium transition-colors capitalize"
                    style={{
                      background: backupSchedule === s ? "var(--accent-subtle)" : "var(--surface)",
                      color: backupSchedule === s ? "var(--accent)" : "var(--text-secondary)",
                      border: `1px solid ${backupSchedule === s ? "var(--accent-border)" : "var(--border)"}`,
                    }}
                  >
                    {s === "manual" ? "Manuel" : s === "daily" ? "Günlük" : s === "weekly" ? "Haftalık" : "Aylık"}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-[12px]"
                onClick={triggerBackup}
                disabled={!accessToken || status === "syncing"}
              >
                <Cloud className="h-3.5 w-3.5" />
                Şimdi yedekle
              </Button>
              {user && (
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full justify-start gap-2 text-[12px]"
                  onClick={() => { setMenuOpen(false); void signOut(); }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Çıkış yap
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status pill ── */}
      <div className="flex items-center gap-1.5">
        {/* Status icon (clickable to sync) */}
        <motion.button
          onClick={triggerSync}
          disabled={!accessToken || status === "syncing" || driveDisabled}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
          style={{
            background: "var(--bg-secondary)",
            borderColor: status === "error" ? "rgba(248,113,113,0.4)" : driveDisabled ? "rgba(252,163,17,0.4)" : "var(--border)",
            boxShadow: "var(--panel-shadow)",
          }}
          whileHover={accessToken && !driveDisabled ? { scale: 1.08 } : {}}
          whileTap={accessToken && !driveDisabled ? { scale: 0.92 } : {}}
          title={!accessToken ? "Drive sync için yeniden giriş yapın" : driveDisabled ? "Drive bağlı değil — yerel kaydediliyor" : "Şimdi senkronize et"}
        >
          <StatusIcon status={status} hasToken={!!accessToken} driveDisabled={driveDisabled} />
        </motion.button>

        {/* User avatar / menu trigger */}
        <motion.button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-7 w-7 items-center justify-center rounded-full border overflow-hidden transition-colors"
          style={{
            background: menuOpen ? "var(--accent-subtle)" : "var(--bg-secondary)",
            borderColor: menuOpen ? "var(--accent-border)" : "var(--border)",
            boxShadow: "var(--panel-shadow)",
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title="Hesap & senkronizasyon"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : user ? (
            <RefreshCw
              className="h-3.5 w-3.5"
              style={{ color: menuOpen ? "var(--accent)" : "var(--text-muted)" }}
            />
          ) : (
            <LogIn
              className="h-3.5 w-3.5"
              style={{ color: menuOpen ? "var(--accent)" : "var(--text-muted)" }}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}

/* ─── Status icon with animation ──────────────────────────────────────────── */

function StatusIcon({ status, hasToken, driveDisabled }: { status: string; hasToken: boolean; driveDisabled: boolean }) {
  if (!hasToken) {
    return <CloudOff className="h-3.5 w-3.5" style={{ color: "var(--text-disabled)" }} />;
  }
  if (driveDisabled) {
    return <CloudOff className="h-3.5 w-3.5" style={{ color: "#fca319" }} />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "syncing" && (
        <motion.span
          key="syncing"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Cloud className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          </motion.span>
        </motion.span>
      )}

      {status === "success" && (
        <motion.span
          key="success"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        >
          <Check className="h-3.5 w-3.5" style={{ color: "var(--code-2)" }} />
        </motion.span>
      )}

      {status === "error" && (
        <motion.span
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AlertCircle className="h-3.5 w-3.5" style={{ color: "var(--danger)" }} />
        </motion.span>
      )}

      {(status === "idle" || !["syncing", "success", "error"].includes(status)) && (
        <motion.span
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Cloud className="h-3.5 w-3.5" style={{ color: "var(--text-disabled)" }} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ─── Helper ──────────────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}
