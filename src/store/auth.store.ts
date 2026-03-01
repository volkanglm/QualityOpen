import { create } from "zustand";
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  refreshAndGetClaims,
  refreshGoogleToken,
  clearRefreshToken,
  clearFirebaseRefreshToken,
} from "@/lib/firebase";
import { resetFolderCache } from "@/lib/drive";
import {
  saveAuthCache,
  loadAuthCache,
  clearAuthCache,
} from "@/lib/offlineCache";
import { firebaseConfigured } from "@/lib/firebase";
import type { User } from "@/types";

// ─── Store shape ───────────────────────────────────────────────────────────────

interface AuthStore {
  // ── Persistent state ──
  user: User | null;
  accessToken: string | null;    // Google Drive OAuth token
  loading: boolean;
  initialized: boolean;          // Firebase listener has fired at least once
  error: string | null;

  // ── License / offline state ──
  premium: boolean | null;   // null = not yet determined; false = no license
  offlineMode: boolean;          // true when running from offline cache
  booting: boolean;          // true during splash screen (initial boot)

  // ── Actions ──
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setToken: (t: string) => void;
  refreshClaims: () => Promise<void>;

  // ── Internal setters ──
  _setUser: (u: User | null) => void;
  _setLoading: (v: boolean) => void;
  _setInit: (v: boolean) => void;
  _setPremium: (v: boolean | null) => void;
  _setOffline: (v: boolean) => void;
  _setBooting: (v: boolean) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  accessToken: null,
  loading: false,
  initialized: false,
  error: null,
  premium: null,
  offlineMode: false,
  booting: true,   // show splash while finding user

  // ── Sign in ──
  signIn: async () => {
    set({ loading: true, error: null });
    try {
      const result = await signInWithGoogle();
      const profile: User = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      // premium from JWT — null means not yet verified (default to false to avoid paywall loops)
      const premium = result.premium ?? false;
      set({ user: profile, accessToken: result.accessToken, premium, loading: false, error: null });
      await saveAuthCache({ ...profile, premium });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      // Don't show error if user simply closed the window
      set({ loading: false, error: msg === "cancelled" ? null : msg });
    }
  },

  // ── Sign out ──
  signOut: async () => {
    await signOutUser();
    await clearAuthCache();
    clearRefreshToken();
    clearFirebaseRefreshToken();
    resetFolderCache();
    set({
      user: null,
      accessToken: null,
      premium: null,
      offlineMode: false,
      error: null,
    });
  },

  // ── Force-refresh Firebase claims ──
  refreshClaims: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const claims = await refreshAndGetClaims(true);
      if (claims) {
        set({ premium: claims.premium });
        await saveAuthCache({ ...user, premium: claims.premium });
      }
    } catch {
      // Network issue — stay with current premium value
    }
  },

  setToken: (t) => set({ accessToken: t }),
  _setUser: (u) => set({ user: u }),
  _setLoading: (v) => set({ loading: v }),
  _setInit: (v) => set({ initialized: v }),
  _setPremium: (v) => set({ premium: v }),
  _setOffline: (v) => set({ offlineMode: v }),
  _setBooting: (v) => set({ booting: v }),
}));

// ─── Boot sequence ─────────────────────────────────────────────────────────────
//
// Called once from App.tsx on mount.
// Wires up Firebase auth state changes and runs the offline-first
// boot logic: online → refresh claims + cache; offline → use cache.
//
export function initAuthListener(): () => void {
  if (!firebaseConfigured) {
    useAuthStore.setState({ booting: false, user: null, premium: null });
    return () => { };
  }


  const bootTimer = setTimeout(() => {
    if (useAuthStore.getState().booting) {
      useAuthStore.setState({ booting: false, initialized: true, user: null, premium: null });
    }
  }, 4000);

  const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
    clearTimeout(bootTimer);
    const setState = useAuthStore.setState;

    if (firebaseUser) {
      const profile: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      // End boot immediately — async ops run in background
      setState({ user: profile, initialized: true, booting: false });

      // Run token + claims refresh in background (non-blocking)
      void (async () => {
        if (navigator.onLine) {
          const newAccessToken = await refreshGoogleToken().catch(() => null);
          if (newAccessToken) setState({ accessToken: newAccessToken });

          try {
            const claims = await refreshAndGetClaims(false);
            if (claims) {
              setState({ premium: claims.premium, offlineMode: false });
              await saveAuthCache({ ...profile, premium: claims.premium });
            } else {
              // auth.currentUser was transiently null — default to false
              setState({ premium: false, offlineMode: false });
            }
          } catch {
            const cache = await loadAuthCache();
            if (cache?.uid === firebaseUser.uid) {
              setState({ premium: cache.premium, offlineMode: true });
            } else {
              setState({ premium: false, offlineMode: false });
            }
          }
        } else {
          setState({ offlineMode: true });
          const cache = await loadAuthCache();
          setState({ premium: cache?.uid === firebaseUser.uid ? cache.premium : false });
        }
      })();
    } else {
      // Guard: if the store already has an authenticated user and boot is done,
      // this null event is likely a spurious Firebase internal token refresh event.
      // Real sign-out is handled by the signOut() action which clears user directly.
      const currentState = useAuthStore.getState();
      if (!currentState.booting && currentState.user) {
        return;
      }

      // Firebase has no session — try loading from auth cache (covers both online and offline cases).
      // This happens when the user signed in via the native PKCE flow (bypassing signInWithCredential),
      // so Firebase SDK never stored a session but our own cache may have one.
      const cache = await Promise.race([
        loadAuthCache(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);

      console.log("[AuthBoot] Cache load result:", !!cache, "online:", navigator.onLine);
      if (cache) {
        setState({
          user: { uid: cache.uid, email: cache.email, displayName: cache.displayName, photoURL: cache.photoURL },
          premium: cache.premium,
          offlineMode: !navigator.onLine,
          initialized: true,
          booting: false,
        });
        // Background: refresh claims to verify premium is still current
        if (navigator.onLine) {
          void refreshAndGetClaims(false).then((claims) => {
            if (claims) setState({ premium: claims.premium, offlineMode: false });
          }).catch(() => { /* keep cached value */ });
        }
      } else {
        setState({ user: null, premium: null, offlineMode: !navigator.onLine, initialized: true, booting: false });
        if (navigator.onLine) {
          void clearAuthCache().catch((e) => console.warn("[AuthBoot] clearAuthCache failed:", e));
          resetFolderCache();
        }
      }
    }
  });

  return unsubscribe;
}

// ─── Network change watcher ───────────────────────────────────────────────────
//
// When the app comes back online after an offline session,
// silently refresh claims and update the cache.
//
export function initNetworkWatcher(): () => void {
  const handleOnline = async () => {
    const { user, offlineMode, refreshClaims } = useAuthStore.getState();
    if (user && offlineMode) {
      useAuthStore.setState({ offlineMode: false });
      await refreshClaims();
    }
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
