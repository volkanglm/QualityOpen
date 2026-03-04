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

  // ── License / offline / local sync state ──
  premium: boolean | null;   // null = not yet determined; false = no license
  offlineMode: boolean;          // true when running from offline cache
  booting: boolean;          // true during splash screen (initial boot)
  localFolderPath: string | null; // Path to local backup folder (Premium)

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
  setLocalFolderPath: (path: string | null) => void;
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
  localFolderPath: localStorage.getItem("qo_local_folder_path"),

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
      set({ user: profile, accessToken: result.accessToken, premium, loading: false, error: null, initialized: true });
      // Fire-and-forget: don't let IndexedDB issues block the UI after sign-in
      void saveAuthCache({ ...profile, premium }).catch((e) =>
        console.warn("[Auth] saveAuthCache failed (non-blocking):", e)
      );
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
  setLocalFolderPath: (path) => {
    if (path) localStorage.setItem("qo_local_folder_path", path);
    else localStorage.removeItem("qo_local_folder_path");
    set({ localFolderPath: path });
  },
}));

// ─── Boot sequence ─────────────────────────────────────────────────────────────
//
// Two-phase boot — decoupled from Firebase timing:
//
// Phase 1 (immediate): Load from IndexedDB cache (max 1.5 s), then set
//   booting:false / initialized:true.  Never waits for Firebase.
//
// Phase 2 (background): Firebase onAuthStateChanged runs after boot is done.
//   Only updates token / claims / premium — never re-blocks the UI.
//
export function initAuthListener(): () => void {
  if (!firebaseConfigured) {
    useAuthStore.setState({ booting: false, initialized: true });
    return () => { };
  }

  // ── Phase 1: boot from cache ─────────────────────────────────────────────
  void (async () => {
    try {
      const cache = await Promise.race([
        loadAuthCache().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);

      console.log("[AuthBoot] Cache load result:", !!cache, "online:", navigator.onLine);

      if (cache) {
        useAuthStore.setState({
          user: { uid: cache.uid, email: cache.email, displayName: cache.displayName, photoURL: cache.photoURL },
          premium: cache.premium,
          offlineMode: !navigator.onLine,
          initialized: true,
          booting: false,
        });
      } else {
        useAuthStore.setState({
          user: null,
          premium: null,
          offlineMode: !navigator.onLine,
          initialized: true,
          booting: false,
        });
        if (navigator.onLine) {
          void clearAuthCache().catch((e) => console.warn("[AuthBoot] clearAuthCache failed:", e));
          resetFolderCache();
        }
      }
    } catch (err) {
      console.error("[AuthBoot] Cache boot failed, forcing completion:", err);
      useAuthStore.setState({ booting: false, initialized: true, user: null, premium: null });
    }
  })();

  // ── Phase 2: Firebase listener — background updates only ─────────────────
  // May fire seconds later in production WKWebView. Boot is already done.
  const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
    try {
      const setState = useAuthStore.setState;
      const currentState = useAuthStore.getState();

      if (firebaseUser) {
        const profile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };

        // If boot raced and isn't done yet, complete it now
        if (currentState.booting) {
          setState({ user: profile, initialized: true, booting: false });
        } else if (!currentState.user) {
          // Boot done, no cached user — Firebase confirmed session exists
          setState({ user: profile });
        }

        // Background: refresh Google OAuth token + claims
        if (navigator.onLine) {
          void (async () => {
            const newAccessToken = await refreshGoogleToken().catch(() => null);
            if (newAccessToken) setState({ accessToken: newAccessToken });

            try {
              const claims = await refreshAndGetClaims(false);
              if (claims) {
                setState({ premium: claims.premium, offlineMode: false });
                void saveAuthCache({ ...profile, premium: claims.premium }).catch(() => { });
              } else {
                setState({ premium: false, offlineMode: false });
              }
            } catch {
              // Claims failed — keep cached premium value
            }
          })();
        }
      } else {
        // Firebase reports no session.
        // If user came from cache, ignore — real sign-out goes through signOut().
        if (!currentState.booting && currentState.user) {
          return;
        }
        // Boot still pending (rare) and Firebase confirmed no session
        if (currentState.booting) {
          setState({ user: null, premium: null, offlineMode: !navigator.onLine, initialized: true, booting: false });
        }
      }
    } catch (err) {
      console.error("[AuthBoot] Firebase background callback error:", err);
      // Phase 1 already completed boot — no action needed here
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
