import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, CheckCircle, Loader2, ExternalLink, Sparkles, Layers, ShieldCheck, DownloadCloud } from "lucide-react";
import { useLicenseStore } from "@/store/license.store";
import { useToastStore } from "@/store/toast.store";

export function LicenseModal() {
  const { modalOpen, error, activateLicense, closeModal } = useLicenseStore();
  const { push } = useToastStore();

  const [key, setKey] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "success">("idle");
  const [localErr, setLocalErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!modalOpen) {
      setKey("");
      setPhase("idle");
      setLocalErr(null);
    }
  }, [modalOpen]);

  if (!modalOpen) return null;

  const handleActivate = async () => {
    if (!key.trim()) return;
    setLocalErr(null);
    setPhase("loading");

    const result = await activateLicense(key.trim());

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleActivate();
    if (e.key === "Escape") closeModal();
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
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && phase !== "loading" && phase !== "success") {
            closeModal();
          }
        }}
      >
        <motion.div
          key="license-card"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={
            phase === "success"
              ? { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
              : { opacity: 1, scale: 1, y: 0 }
          }
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="relative rounded-2xl border flex overflow-hidden shadow-2xl"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
            width: 720,
            maxWidth: "calc(100vw - 32px)",
            minHeight: 400,
          }}
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-50 p-1.5 rounded-full bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            disabled={phase === "loading" || phase === "success"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          {/* Success overlay over the entire card */}
          <AnimatePresence>
            {phase === "success" && (
              <motion.div
                key="success-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[var(--bg-primary)]"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle className="h-20 w-20 text-[#4ade80]" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 text-xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Aktivasyon Başarılı!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm mt-2 font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  QualityOpen Pro'ya hoş geldiniz. Sınırları kaldırdınız.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LEFT COLUMN: Features & Purchase */}
          <div className="w-[340px] flex flex-col justify-between p-8 bg-[var(--surface)] border-r border-[var(--border)] relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] rounded-full bg-[var(--accent)] opacity-[0.05] blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Araştırmanızda Sınırları Kaldırın
              </h2>
              <p className="text-xs leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
                QualityOpen Pro ile projelerinizdeki kısıtlamaları aşın ve tam yapılandırılmış güçlü AI araçlarından sınırsızca yararlanın.
              </p>

              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex-shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Sınırsız Belge ve Proje</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Proje ve ekleyebileceğiniz analiz belgelerinde limite takılmayın.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Gelişmiş Yapay Zeka</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Metin kodlama, sentezleme ve asistan özelliklerini kullanın.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex-shrink-0">
                    <DownloadCloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tam Dışa Aktarma</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Word, Excel, CSV ve yüksek çözünürlüklü grafik dışa aktarım formatları.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>1 Yıllık Güncelleme</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Yazılıma gelecek tüm yeni araç ve analiz bileşenlerinden ücretsiz yararlanın.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-8 relative z-10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open("https://qualityopen.lemonsqueezy.com", "_blank")}
                className="w-full h-11 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Ömür Boyu Lisans Al ($149)
                <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
              </motion.button>
              <p className="text-[10px] text-center mt-3 text-emerald-600/80 font-medium">✨ Tek seferlik ödeme. Abonelik yok.</p>
            </div>
          </div>

          {/* RIGHT COLUMN: Activation */}
          <div className="flex-1 p-10 flex flex-col justify-center bg-[var(--bg-primary)]">
            <div className="max-w-[280px] w-full mx-auto">
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-6 shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <Key className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>

              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Zaten lisansınız var mı?</h3>
              <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>Satın aldığınız lisans anahtarını yapıştırarak bilgisayarınızı etkinleştirin.</p>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Lisans Anahtarı
                </label>
                <div className="relative group">
                  <input
                    ref={inputRef}
                    type="text"
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value.toUpperCase());
                      setLocalErr(null);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={phase === "loading"}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    spellCheck={false}
                    className="w-full rounded-lg border px-4 py-3.5 text-sm font-mono tracking-[0.15em] transition-all bg-[var(--bg-primary)] shadow-sm focus:shadow-md"
                    style={{
                      borderColor: displayError ? "var(--danger)" : "var(--border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      if (!displayError) e.target.style.borderColor = "var(--accent)";
                    }}
                    onBlur={(e) => {
                      if (!displayError) e.target.style.borderColor = "var(--border)";
                    }}
                  />
                </div>

                <AnimatePresence>
                  {displayError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[11px] font-medium pt-1"
                      style={{ color: "var(--danger)" }}
                    >
                      {displayError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleActivate}
                disabled={!key.trim() || phase === "loading" || phase === "success"}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg-primary)",
                  opacity: !key.trim() || phase === "loading" ? 0.5 : 1,
                  cursor: !key.trim() || phase === "loading" ? "not-allowed" : "pointer",
                  boxShadow: "var(--float-shadow)"
                }}
              >
                {phase === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--bg-primary)]" />
                    <span className="opacity-90">Doğrulanıyor...</span>
                  </>
                ) : (
                  "Etkinleştir"
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
