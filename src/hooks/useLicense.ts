import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

interface LicenseState {
  premium:    boolean | null;
  refreshing: boolean;
  refresh:    () => Promise<void>;
}

/**
 * useLicense — reads premium state from the auth store and
 * optionally polls Firebase for a claim update.
 *
 * Pass `poll: true` when rendering the PaywallPage so the app
 * automatically detects when an admin grants a seat.
 */
export function useLicense(options: { poll?: boolean } = {}): LicenseState {
  const { premium, refreshClaims } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshClaims();
    } finally {
      setRefreshing(false);
    }
  }, [refreshClaims]);

  // Polling — only active when `poll: true` (i.e. on the paywall)
  useEffect(() => {
    if (!options.poll || premium === true) return;

    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [options.poll, premium, refresh]);

  return { premium, refreshing, refresh };
}
