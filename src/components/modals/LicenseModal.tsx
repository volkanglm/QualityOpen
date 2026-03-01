import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, CheckCircle, Loader2, ExternalLink, Gift } from "lucide-react";
import { useLicenseStore } from "@/store/license.store";
import { useAuthStore }    from "@/store/auth.store";
import { useToastStore }   from "@/store/toast.store";

// ─── Component ────────────────────────────────────────────────────────────────

export function LicenseModal() {
  const { modalOpen, status, error, activateLicense, startTrial, closeModal } = useLicenseStore();
  const { user }  = useAuthStore();
  const { push }  = useToastStore();

  const [key,       setKey]       = useState("");
  const [phase,     setPhase]     = useState<"idle" | "loading" | "success">("idle");
  const [localErr,  setLocalErr]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!modalOpen) return null;

  const handleActivate = async () => {
    if (!key.trim() || !user) return;
    setLocalErr(null);
    setPhase("loading");

    const result = await activateLicense(user.uid, key.trim());

    if (result.success) {
      setPhase("success");
      setTimeout(() => {
        closeModal();
        push("Lisans aktifleştirildi. QualityOpen Pro'ya hoş geldiniz!", "success");
      }, 1800);
    } else {
      setPhase("idle");
      setLocalErr(result.error ?? "Geçersiz lisans anahtarı.");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleTrial = async () => {
    if (!user) return;
    await startTrial(user.uid);
    push("14 günlük deneme süreniz başladı.", "info");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleActivate();
    if (e.key === "Escape" && status === "trial") closeModal();
  };

  const displayError = localErr ?? error;

  return (
    <AnimatePresence>
      <motion.div
        key="license-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[300] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          key="license-card"
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={
            phase === "success"
              ? { opacity: 0, scale: 0.60, y: -20, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="relative rounded-[var(--radius-lg)] border overflow-hidden"
          style={{
            background:  "var(--bg-secondary)",
            borderColor: "var(--border)",
            boxShadow:   "var(--float-shadow), 0 0 0 1px var(--border)",
            width:       400,
            maxWidth:    "calc(100vw - 32px)",
          }}
        >
          {/* Success overlay */}
          <AnimatePresence>
            {phase === "success" && (
              <motion.div
                key="success-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-[var(--radius-lg)]"
                style={{ background: "var(--bg-secondary)" }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: 0.1 }}
                >
                  <CheckCircle className="h-14 w-14" style={{ color: "#4ade80" }} />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-4 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Lisans aktifleştirildi!
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  QualityOpen Pro'ya hoş geldiniz.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top border line */}
          <div className="h-px w-full" style={{ background: "var(--border)" }} />

          {/* Content */}
          <div className="px-7 py-6">
            {/* Icon + heading */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="h-10 w-10 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <Key className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  QualityOpen Pro
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Lisans anahtarınızı girin
                </p>
              </div>
            </div>

            {/* Features */}
            <div
              className="rounded-[var(--radius-md)] px-4 py-3 mb-5 space-y-1.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)" }}
            >
              {[
                "Sınırsız proje ve belge",
                "Gelişmiş AI analiz özellikleri",
                "Google Drive otomatik yedekleme",
                "Tüm dışa aktarma formatları",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#4ade80" }} />
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>

            {/* License key input */}
            <div className="space-y-2 mb-4">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Lisans Anahtarı
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value.toUpperCase());
                    setLocalErr(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoFocus
                  spellCheck={false}
                  className="w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-mono tracking-widest"
                  style={{
                    background:  "var(--bg-primary)",
                    borderColor: displayError ? "var(--danger)" : "var(--border)",
                    color:       "var(--text-primary)",
                    outline:     "none",
                    letterSpacing: "0.08em",
                    caretColor:  "var(--accent)",
                  }}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {displayError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px]"
                    style={{ color: "var(--danger)" }}
                  >
                    {displayError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Activate button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleActivate}
              disabled={!key.trim() || phase === "loading" || phase === "success"}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] text-[13px] font-semibold transition-opacity"
              style={{
                background: "var(--text-primary)",
                color:      "var(--bg-primary)",
                opacity:    !key.trim() || phase === "loading" ? 0.45 : 1,
                cursor:     !key.trim() || phase === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {phase === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Doğrulanıyor…
                </>
              ) : (
                "Lisansı Etkinleştir"
              )}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <span className="text-[10px]" style={{ color: "var(--text-disabled)" }}>ya da</span>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            {/* Trial + Buy options */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleTrial}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors"
                style={{
                  background:  "transparent",
                  borderColor: "var(--border)",
                  color:       "var(--text-secondary)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                <Gift className="h-3.5 w-3.5" />
                14 Gün Ücretsiz Dene
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-md)] text-[12px] font-medium border transition-colors"
                style={{
                  background:  "var(--surface)",
                  borderColor: "var(--border)",
                  color:       "var(--text-secondary)",
                }}
                onClick={() =>
                  window.open("https://qualityopen.lemonsqueezy.com", "_blank")
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Satın Al
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
