import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface ClaimsResult {
  idToken: string;
  premium: boolean;
}

// NOTE: fetch proxy removed — we no longer use Firebase SDK's signInWithCredential,
// so there's no need to intercept Firebase's internal HTTP requests.
// All auth HTTP is done via invoke("exchange_google_code") + XHR for signInWithIdp.

// ─── Firebase initialization ─────────────────────────────────────────────────

// MOCK: Completely hide IndexedDB from Firebase to prevent internal deadlocks
// (Firebase Heartbeat and Telemetry try to use IndexedDB even with inMemoryPersistence)
try {
  Object.defineProperty(window, 'indexedDB', {
    get: () => undefined
  });
} catch (e) {
  console.warn("[AuthBoot] Failed to disable window.indexedDB", e);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard against missing / placeholder credentials
export const firebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(
    firebaseConfigured
      ? firebaseConfig
      : { apiKey: "placeholder", authDomain: "placeholder.firebaseapp.com", projectId: "placeholder" },
  );
} else {
  app = getApps()[0];
}

export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});
export const db = getFirestore(app);

// ─── Refresh token storage (XOR-encoded in localStorage) ─────────────────────

const RT_KEY = "qo_rt";
const RT_CIPHER = "QO_rt_2024_refresh_salt_xor_key";

function xorEncode(s: string): string {
  if (!s) return "";
  try {
    let r = "";
    for (let i = 0; i < s.length; i++)
      r += String.fromCharCode(s.charCodeAt(i) ^ RT_CIPHER.charCodeAt(i % RT_CIPHER.length));
    return btoa(r);
  } catch { return ""; }
}

function xorDecode(e: string): string {
  if (!e) return "";
  try {
    const s = atob(e);
    let r = "";
    for (let i = 0; i < s.length; i++)
      r += String.fromCharCode(s.charCodeAt(i) ^ RT_CIPHER.charCodeAt(i % RT_CIPHER.length));
    return r;
  } catch { return ""; }
}

function saveRefreshToken(rt: string): void {
  if (rt) localStorage.setItem(RT_KEY, xorEncode(rt));
}

function loadRefreshToken(): string | null {
  const enc = localStorage.getItem(RT_KEY);
  return enc ? xorDecode(enc) : null;
}

export function clearRefreshToken(): void {
  localStorage.removeItem(RT_KEY);
}

// ─── Firebase refresh token storage (XOR-encoded in localStorage) ─────────────

const FB_RT_KEY = "qo_fb_rt";

function saveFirebaseRefreshToken(rt: string): void {
  if (rt) localStorage.setItem(FB_RT_KEY, xorEncode(rt));
}

function loadFirebaseRefreshToken(): string | null {
  const enc = localStorage.getItem(FB_RT_KEY);
  return enc ? xorDecode(enc) : null;
}

export function clearFirebaseRefreshToken(): void {
  localStorage.removeItem(FB_RT_KEY);
}

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split('.')[1];
  return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
}

/**
 * Exchange the stored refresh token for a fresh access token.
 * Returns null if no refresh token is stored or the exchange fails.
 */
export async function refreshGoogleToken(): Promise<string | null> {
  const rt = loadRefreshToken();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const secret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? "";
  if (!rt || !clientId) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: rt,
        client_id: clientId,
        client_secret: secret,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ─── Native Google OAuth (Desktop app PKCE flow) ─────────────────────────────
//
// Uses a temporary loopback HTTP server instead of a popup, so it works
// from tauri://localhost without CORS or authorized-domain issues.

export interface GoogleSignInResult {
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null };
  accessToken: string;
  idToken: string;
  firebaseRefreshToken: string | null;
  premium?: boolean;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID not set in .env");
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY not set in .env");

  console.log("[OAuth] Step 1: generating PKCE");
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);

  console.log("[OAuth] Step 2: starting local callback server");
  const port = await invoke<number>("start_oauth_listener");
  console.log("[OAuth] Step 2: port =", port);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://127.0.0.1:${port}`,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "select_account",
  });
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  try {
    const existing = await WebviewWindow.getByLabel("qo-google-auth");
    if (existing) await existing.close();
  } catch { /* ignore */ }

  console.log("[OAuth] Step 3: opening auth window");
  const callbackUrl = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const timer = setTimeout(() => {
      settle(() => reject(new Error("Google sign-in timed out (5 min)")));
      void authWindow?.close();
    }, 5 * 60 * 1000);

    let unlistenOAuth: (() => void) | undefined;
    listen<string>("oauth-callback", (event) => {
      console.log("[OAuth] Step 4: oauth-callback received, payload length =", event.payload?.length);
      clearTimeout(timer);
      unlistenOAuth?.();
      settle(() => resolve(event.payload));
      void authWindow?.close();
    }).then((fn) => { unlistenOAuth = fn; })
      .catch((e: unknown) => {
        clearTimeout(timer);
        settle(() => reject(e instanceof Error ? e : new Error(String(e))));
      });

    const authWindow = new WebviewWindow("qo-google-auth", {
      url: oauthUrl,
      title: "Google ile Giriş Yap",
      width: 520,
      height: 680,
      center: true,
      resizable: false,
      decorations: true,
    });

    void authWindow.once("tauri://close-requested", () => {
      console.log("[OAuth] Auth window close-requested");
      clearTimeout(timer);
      unlistenOAuth?.();
      settle(() => reject(new Error("cancelled")));
    });

    void authWindow.once("tauri://error", (e) => {
      console.error("[OAuth] Window tauri://error fired.", e);
      clearTimeout(timer);
      unlistenOAuth?.();
      settle(() => reject(new Error(`OAuth window error: ${String(e.payload)}`)));
    });

    void authWindow.once("tauri://destroyed", () => {
      console.log("[OAuth] Auth window destroyed");
      clearTimeout(timer);
      unlistenOAuth?.();
      settle(() => reject(new Error("cancelled")));
    });
  });

  console.log("[OAuth] Step 5: extracting code from callback URL");
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("No auth code in OAuth callback");
  console.log("[OAuth] Step 5: code length =", code.length);

  console.log("[OAuth] Step 6: exchanging code via Rust invoke");
  try {
    const redirectUri = `http://127.0.0.1:${port}`;
    const tokenText = await invoke<string>("exchange_google_code", {
      code,
      clientId,
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? "",
      redirectUri,
      codeVerifier: verifier,
    });
    console.log("[OAuth] Step 6: token exchange done, len =", tokenText.length);

    const tokens = JSON.parse(tokenText) as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error);
    if (!tokens.id_token) throw new Error("No id_token in token response");

    if (tokens.refresh_token) saveRefreshToken(tokens.refresh_token);

    // Step 7: signInWithIdp via XMLHttpRequest (bypasses WKWebView fetch + reqwest hangs)
    console.log("[OAuth] Step 7: signInWithIdp via XHR");
    const idpPayload = JSON.stringify({
      requestUri: redirectUri,
      postBody: `id_token=${encodeURIComponent(tokens.id_token)}&access_token=${encodeURIComponent(tokens.access_token ?? "")}&providerId=google.com`,
      returnSecureToken: true,
      returnIdpCredential: true,
    });

    const idpText = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 15000;
      xhr.onload = () => {
        console.log("[OAuth] Step 7: XHR onload, status =", xhr.status, "len =", xhr.responseText.length);
        resolve(xhr.responseText);
      };
      xhr.onerror = () => reject(new Error("signInWithIdp XHR network error"));
      xhr.ontimeout = () => reject(new Error("signInWithIdp XHR timeout (15s)"));
      xhr.send(idpPayload);
    });

    const idpData = JSON.parse(idpText) as {
      localId?: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
      idToken?: string;
      refreshToken?: string;
      error?: { message: string };
    };

    if (idpData.error) throw new Error(idpData.error.message);
    if (!idpData.localId || !idpData.idToken) throw new Error("signInWithIdp returned invalid data");

    if (idpData.refreshToken) saveFirebaseRefreshToken(idpData.refreshToken);

    let premium: boolean | undefined;
    try {
      const payload = decodeJwtPayload(idpData.idToken);
      premium = !!payload["premium"];
    } catch { /* ignore */ }

    console.log("[OAuth] Done! uid =", idpData.localId, "premium =", premium);
    return {
      user: {
        uid: idpData.localId,
        email: idpData.email ?? null,
        displayName: idpData.displayName ?? null,
        photoURL: idpData.photoUrl ?? null,
      },
      accessToken: tokens.access_token ?? "",
      idToken: idpData.idToken,
      firebaseRefreshToken: idpData.refreshToken ?? null,
      premium,
    };
  } catch (err) {
    console.error("[OAuth] Sign-in failed:", err);
    throw err;
  }
}

// ─── Other auth helpers ───────────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function refreshAndGetClaims(
  forceRefresh = false,
): Promise<ClaimsResult | null> {
  // Primary path: Firebase SDK (used when signInWithCredential was called)
  const user = auth.currentUser;
  if (user) {
    const result = await user.getIdTokenResult(forceRefresh);
    return { idToken: result.token, premium: !!(result.claims["premium"]) };
  }

  // Fallback: exchange stored Firebase refresh token for a fresh idToken
  const fbRt = loadFirebaseRefreshToken();
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!fbRt || !apiKey) return null;

  try {
    const [status, text] = await invoke<[number, string]>("native_http", {
      method: "POST",
      url: `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      headersJson: JSON.stringify({ "Content-Type": "application/x-www-form-urlencoded" }),
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(fbRt)}`,
    });
    if (status !== 200) return null;
    const data = JSON.parse(text) as { id_token?: string; refresh_token?: string };
    if (!data.id_token) return null;
    if (data.refresh_token) saveFirebaseRefreshToken(data.refresh_token);
    const payload = decodeJwtPayload(data.id_token);
    return { idToken: data.id_token, premium: !!payload["premium"] };
  } catch {
    return null;
  }
}

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}
