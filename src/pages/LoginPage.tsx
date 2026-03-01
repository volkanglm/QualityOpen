import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore }        from "@/store/auth.store";
import { firebaseConfigured }  from "@/lib/firebase";
import { AppLogo }             from "@/components/ui/AppLogo";

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
      animate={{ scale: 1,    opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1], delay: 0.06 }}
    >
      <AppLogo size={64} variant="badge" />
    </motion.div>
  );
}

// ─── Debug log panel ──────────────────────────────────────────────────────────

function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addLog = useCallback((msg: string) => {
    const t = new Date().toISOString().slice(11, 23);
    const entry = `[${t}] ${msg}`;
    logsRef.current = [...logsRef.current, entry];
    setLogs([...logsRef.current]);
  }, []);

  // Snapshot current state on mount
  useEffect(() => {
    addLog("BUILD v3 — direct invoke, no signInWithCredential, body-read timeout");
    const s = useAuthStore.getState();
    addLog(`SNAPSHOT booting:${s.booting} init:${s.initialized} user:${s.user?.email ?? "null"} premium:${s.premium} loading:${s.loading} error:${s.error ?? "null"}`);
  }, [addLog]);

  // Track every store change
  useEffect(() => {
    const unsub = useAuthStore.subscribe((s, p) => {
      const diff: string[] = [];
      if (s.booting     !== p.booting)     diff.push(`booting:${p.booting}→${s.booting}`);
      if (s.initialized !== p.initialized) diff.push(`init:${p.initialized}→${s.initialized}`);
      if (s.user        !== p.user)        diff.push(`user:${p.user?.email ?? "null"}→${s.user?.email ?? "null"}`);
      if (s.premium     !== p.premium)     diff.push(`premium:${p.premium}→${s.premium}`);
      if (s.loading     !== p.loading)     diff.push(`loading:${p.loading}→${s.loading}`);
      if (s.error       !== p.error)       diff.push(`error:${p.error ?? "null"}→${s.error ?? "null"}`);
      if (diff.length) addLog(`STORE ${diff.join(" | ")}`);
    });
    return () => unsub();
  }, [addLog]);

  // Intercept console output
  useEffect(() => {
    const oLog = console.log, oWarn = console.warn, oErr = console.error;
    const fmt = (a: unknown[]) => a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
    console.log   = (...a) => { oLog(...a);   addLog("LOG  " + fmt(a)); };
    console.warn  = (...a) => { oWarn(...a);  addLog("WARN " + fmt(a)); };
    console.error = (...a) => { oErr(...a);   addLog("ERR  " + fmt(a)); };
    return () => { console.log = oLog; console.warn = oWarn; console.error = oErr; };
  }, [addLog]);

  // Auto-scroll textarea to bottom
  useEffect(() => {
    const el = textareaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const selectAll = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t"
      style={{ background: "#09090b", borderColor: "#27272a" }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid #27272a" }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600, color: "#71717a" }}>
          DEBUG — {logs.length} events · Cmd+A to select all, then Cmd+C
        </span>
        <button
          onClick={selectAll}
          style={{
            fontFamily: "monospace", fontSize: 10,
            padding: "2px 8px", borderRadius: 3,
            background: "#18181b", border: "1px solid #3f3f46",
            color: "#a1a1aa", cursor: "pointer",
          }}
        >
          Select all
        </button>
      </div>
      <textarea
        ref={textareaRef}
        readOnly
        value={logsRef.current.join("\n")}
        style={{
          width: "100%", height: 180, resize: "none",
          background: "#09090b", border: "none", outline: "none",
          fontFamily: "monospace", fontSize: 10, color: "#a1a1aa",
          lineHeight: 1.6, padding: "8px 12px", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── Login page ────────────────────────────────────────────────────────────────

export function LoginPage() {
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
              Qualitative data analysis for researchers
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
            background:   "var(--bg-secondary)",
            borderColor:  "var(--border)",
            boxShadow:    "var(--panel-shadow)",
          }}
        >
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Sign in to continue
            </p>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Your data is stored locally and synced to your own Google Drive.
              We never store anything on our servers.
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
              background:   "var(--bg-tertiary)",
              borderColor:  "var(--border)",
              color:        loading ? "var(--text-muted)" : "var(--text-primary)",
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
                  <span style={{ color: "var(--text-secondary)" }}>Signing in…</span>
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
                  Continue with Google
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
                  background:  "rgba(252, 163, 17, 0.08)",
                  border:      "1px solid rgba(252, 163, 17, 0.25)",
                  color:       "#fca319",
                }}
              >
                <strong>Firebase not configured.</strong> Add your Firebase credentials to{" "}
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
                    background:  "var(--danger-subtle)",
                    border:      "1px solid rgba(248,113,113,0.25)",
                    color:       "var(--danger)",
                  }}
                >
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] leading-relaxed"
          style={{ color: "var(--text-disabled)" }}
        >
          Offline-first · Your data stays yours
        </motion.p>
      </motion.div>

      {/* Debug panel — always visible at bottom */}
      <DebugPanel />
    </div>
  );
}
