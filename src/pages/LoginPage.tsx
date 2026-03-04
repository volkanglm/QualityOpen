import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth.store";
import { firebaseConfigured } from "@/lib/firebase";
import { AppLogo } from "@/components/ui/AppLogo";
import { useT } from "@/lib/i18n";

/* Google "G" SVG — crisp at small sizes */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* Animated logo mark */
function LogoMark() {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1], delay: 0.06 }}
    >
      <AppLogo size={64} variant="badge" />
    </motion.div>
  );
}

// ─── Login page ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const t = useT();
  const { loading, error, signIn } = useAuthStore();

  const isConfigured = firebaseConfigured;

  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Subtle gradient backdrop */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, var(--accent-subtle) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        className="relative z-10 flex flex-col items-center gap-8 w-80"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <LogoMark />
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              QualityOpen
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              {t("login.subtitle")}
            </motion.p>
          </div>
        </div>

        {/* Sign-in card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="w-full rounded-[var(--radius-lg)] border p-6 flex flex-col gap-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            boxShadow: "var(--panel-shadow)",
          }}
        >
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("login.title")}
            </p>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {t("login.desc")}
            </p>
          </div>

          {/* Google sign-in button */}
          <motion.button
            whileHover={!loading ? { scale: 1.015, y: -1 } : {}}
            whileTap={!loading ? { scale: 0.975 } : {}}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            onClick={isConfigured ? signIn : undefined}
            disabled={loading || !isConfigured}
            className="relative flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              background: "var(--bg-tertiary)",
              borderColor: "var(--border)",
              color: loading ? "var(--text-muted)" : "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              if (!loading && isConfigured)
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>{t("login.signingIn")}</span>
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <GoogleIcon />
                  {t("login.google")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Firebase not configured warning */}
          {!isConfigured && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div
                className="rounded-[var(--radius-sm)] p-3 text-xs leading-relaxed"
                style={{
                  background: "rgba(252, 163, 17, 0.08)",
                  border: "1px solid rgba(252, 163, 17, 0.25)",
                  color: "#fca319",
                }}
              >
                <strong>{t("login.notConfigured")}</strong> Add your Firebase credentials to{" "}
                <code className="opacity-80">.env</code> to enable sign-in.
                <br />
                See <code className="opacity-80">.env.example</code> for reference.
              </div>
            </motion.div>
          )}

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-[var(--radius-sm)] p-3 text-xs leading-relaxed"
                  style={{
                    background: "var(--danger-subtle)",
                    border: "1px solid rgba(248,113,113,0.25)",
                    color: "var(--danger)",
                  }}
                >
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-[11px] leading-relaxed"
            style={{ color: "var(--text-disabled)" }}
          >
            {t("login.footer")}
          </motion.p>


        </div>
      </motion.div>

    </div>
  );
}
