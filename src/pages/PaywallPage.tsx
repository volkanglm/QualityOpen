import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  CheckCircle,
  Users,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useAuthStore }  from "@/store/auth.store";
import { useLicense }    from "@/hooks/useLicense";
import { useToastStore } from "@/store/toast.store";
import { AppLogo }       from "@/components/ui/AppLogo";

// ─── Lemon Squeezy checkout URL ───────────────────────────────────────────────
const LS_CHECKOUT_URL = "https://qualityopen.lemonsqueezy.com/buy/qualityopen-pro";

// ─── Features list ────────────────────────────────────────────────────────────
const FEATURES = [
  "Sınırsız proje ve belge",
  "Gelişmiş yapay zeka analizi",
  "Google Drive otomatik yedekleme",
  "Excel, Word (APA 7) ve görsel dışa aktarma",
  "Tüm kodlama ve matris araçları",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PaywallPage() {
  const { user, signOut }      = useAuthStore();
  const { premium, refreshing, refresh } = useLicense({ poll: true });
  const { push }               = useToastStore();

  // Briefly notify when auto-polling detects a newly granted license
  // (the AnimatePresence in App.tsx handles the actual transition)
  useEffect(() => {
    if (premium === true) {
      push("Erişim onaylandı. QualityOpen'a hoş geldiniz.", "success");
    }
  }, [premium, push]);

  const handleRefresh = async () => {
    await refresh();
    if (!useAuthStore.getState().premium) {
      push("Lisans henüz atanmamış. Erişim bekleniyor.", "info");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <motion.div
      key="paywall"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0, scale: 0.99, transition: { duration: 0.2 } }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className="flex h-screen w-screen flex-col items-center justify-center overflow-auto py-12"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0   }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="flex items-center gap-2.5 mb-10"
      >
        <AppLogo size={28} variant="badge" />
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          QualityOpen
        </span>
      </motion.div>

      {/* ── Heading ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.04, ease: [0.2, 0, 0, 1] }}
        className="text-center mb-8 px-4"
      >
        <h1
          className="text-xl font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Nitel araştırmanıza güçlü bir temel kurun.
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Bu hesap henüz bir lisansla ilişkilendirilmemiş.
        </p>
        {user?.email && (
          <p
            className="text-[12px] mt-1 font-mono"
            style={{ color: "var(--text-disabled)" }}
          >
            {user.email}
          </p>
        )}
      </motion.div>

      {/* ── Cards ── */}
      <div className="flex flex-col gap-3 w-full max-w-[420px] px-4">

        {/* ── Card 1: Personal License ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.2, delay: 0.08, ease: [0.2, 0, 0, 1] }}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{
            background:  "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Kişisel Lisans
          </p>

          {/* Features */}
          <ul className="space-y-2 mb-5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle
                  className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: "var(--border-strong)" }}
                />
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => window.open(LS_CHECKOUT_URL, "_blank")}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-[var(--radius-md)] text-[13px] font-semibold transition-opacity"
            style={{
              background: "var(--text-primary)",
              color:      "var(--bg-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            Lisans Satın Al
            <ExternalLink className="h-3.5 w-3.5" />
          </motion.button>
        </motion.div>

        {/* ── Card 2: B2B / Lab seat ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.2, delay: 0.12, ease: [0.2, 0, 0, 1] }}
          className="rounded-[var(--radius-lg)] border p-5"
          style={{
            background:  "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Kurumsal / Laboratuvar Lisansı
            </p>
          </div>

          <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
            Bir araştırma laboratuvarı veya üniversite bünyesindeyseniz,{" "}
            yöneticinizden bu Google hesabını{" "}
            {user?.email && (
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                ({user.email})
              </span>
            )}{" "}
            kurumsal lisans planınıza eklemesini isteyin.
          </p>

          <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
            Atama yapıldıktan sonra uygulama otomatik olarak kilidini açacak.
          </p>

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Pulsing dot */}
              <div className="relative h-2 w-2">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--border-strong)" }}
                />
                <AccessPulse />
              </div>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {refreshing ? "Kontrol ediliyor…" : "Erişim bekleniyor"}
              </span>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] transition-opacity"
              style={{
                color:   "var(--text-muted)",
                opacity: refreshing ? 0.4 : 1,
                cursor:  refreshing ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw
                className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
              />
              Yenile
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Sign out ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.18, ease: [0.2, 0, 0, 1] }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSignOut}
        className="mt-8 flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-60"
        style={{ color: "var(--text-muted)" }}
      >
        <LogOut className="h-3.5 w-3.5" />
        Farklı hesapla giriş yap
      </motion.button>
    </motion.div>
  );
}

// ─── Subtle pulsing ring around the waiting dot ────────────────────────────────

function AccessPulse() {
  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--border-strong)" }}
        animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
        transition={{
          duration: 2,
          repeat:   Infinity,
          ease:     "easeOut",
          repeatDelay: 0.5,
        }}
      />
    </AnimatePresence>
  );
}
