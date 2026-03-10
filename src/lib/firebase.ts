import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl as openInBrowser } from "@tauri-apps/plugin-opener";
import { xorEncode, xorDecode, AUTH_CIPHER } from "@/lib/crypto";

export interface ClaimsResult {
  idToken: string;
  premium: boolean;
}

// NOTE: fetch proxy removed — we no longer use Firebase SDK's signInWithCredential,
// so there's no need to intercept Firebase's internal HTTP requests.
// All auth HTTP is done via invoke("exchange_google_code") + XHR for signInWithIdp.

// ─── Firebase initialization ─────────────────────────────────────────────────

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

// initializeAuth can only be called ONCE per app. On HMR or multiple imports
// it throws "auth/already-initialized". Fall back to getAuth safely.
let auth: Auth;
try {
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  auth = getAuth(app);
}
export { auth };
export const db = getFirestore(app);

// ─── Refresh token storage (XOR-encoded in localStorage) ─────────────────────

// Refresh token storage logic


function saveRefreshToken(rt: string): void {
  if (rt) localStorage.setItem("qo_rt", xorEncode(rt, AUTH_CIPHER));
}

function loadRefreshToken(): string | null {
  const enc = localStorage.getItem("qo_rt");
  return enc ? xorDecode(enc, AUTH_CIPHER) : null;
}

export function clearRefreshToken(): void {
  localStorage.removeItem("qo_rt");
}

const FB_RT_KEY = "qo_fb_rt";

function saveFirebaseRefreshToken(rt: string): void {
  if (rt) localStorage.setItem(FB_RT_KEY, xorEncode(rt, AUTH_CIPHER));
}

function loadFirebaseRefreshToken(): string | null {
  const enc = localStorage.getItem(FB_RT_KEY);
  return enc ? xorDecode(enc, AUTH_CIPHER) : null;
}

export function clearFirebaseRefreshToken(): void {
  localStorage.removeItem(FB_RT_KEY);
}

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split('.')[1];
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  // atob() returns Latin-1 bytes; convert to percent-encoding then use
  // decodeURIComponent to correctly reconstruct UTF-8 (Türkçe vb.)
  const jsonText = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonText);
}

/**
 * Exchange the stored refresh token for a fresh access token.
 * Returns null if no refresh token is stored or the exchange fails.
 */
export async function refreshGoogleToken(): Promise<string | null> {
  const rt = loadRefreshToken();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!rt || !clientId) return null;

  try {
    // Use native_http to bypass WKWebView fetch restrictions in production
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: rt,
      client_id: clientId,
    }).toString();

    const [status, text] = await invoke<[number, string]>("native_http", {
      method: "POST",
      url: "https://oauth2.googleapis.com/token",
      headersJson: JSON.stringify({ "Content-Type": "application/x-www-form-urlencoded" }),
      body,
    });
    if (status !== 200) return null;
    const data = JSON.parse(text) as { access_token?: string };
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

/**
 * Exchanges a Google ID Token for a Firebase ID Token using the Identity Toolkit API.
 * This effectively logs the user into Firebase.
 */
async function exchangeGoogleIdTokenForFirebaseToken(googleIdToken: string): Promise<{ idToken: string; refreshToken: string; localId: string }> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY not set");

  const body = JSON.stringify({
    postBody: `id_token=${googleIdToken}&providerId=google.com`,
    requestUri: "http://localhost",
    returnIdpCredential: true,
    returnSecureToken: true,
  });

  const [status, text] = await invoke<[number, string]>("native_http", {
    method: "POST",
    url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`,
    headersJson: JSON.stringify({ "Content-Type": "application/json" }),
    body,
  });

  if (status !== 200) {
    console.error("[FirebaseExchange] Request failed:", text);
    throw new Error("Firebase token exchange failed");
  }

  const data = JSON.parse(text);
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
  };
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

  console.debug("[OAuth] Step 1: Generating PKCE flow");
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = crypto.randomUUID();

  console.debug("[OAuth] Step 2: Requesting loopback port");
  const port = await invoke<number>("start_oauth_listener");


  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://127.0.0.1:${port}`,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: state,
    access_type: "offline",
    prompt: "select_account",
  });
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;


  console.debug("[OAuth] Step 3: Opening browser", oauthUrl);
  // Use the system browser (Safari/Chrome) instead of a WKWebView popup.
  // This follows RFC 8252 and avoids WKWebView mixed-content policy in prod.
  const callbackUrl = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    const timer = setTimeout(() => {
      console.error("⏰ [OAuth] Loopback server timed out waiting for redirect.");
      settle(() => reject(new Error("Google sign-in timed out (5 min)")));
    }, 5 * 60 * 1000);

    let unlistenOAuth: (() => void) | undefined;
    listen<string>("oauth-callback", (event) => {
      console.debug("[OAuth] Step 4: Callback received");
      clearTimeout(timer);

      unlistenOAuth?.();
      settle(() => resolve(event.payload));
    }).then((fn) => {
      unlistenOAuth = fn;
    })
      .catch((e: unknown) => {
        console.error("❌ [OAuth] Listen failed:", e);
        clearTimeout(timer);
        settle(() => reject(e instanceof Error ? e : new Error(String(e))));
      });

    // Open the Google auth URL in the user's default browser.
    openInBrowser(oauthUrl).catch((e: unknown) => {
      console.error("❌ [OAuth] Failed to open browser:", e);
      clearTimeout(timer);
      unlistenOAuth?.();
      settle(() => reject(new Error(`Failed to open browser: ${String(e)}`)));
    });
  });

  console.debug("[OAuth] Step 5: Extracting code and state");
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  if (!code) {
    console.error("❌ [OAuth] Callback URL missing code:", callbackUrl);
    throw new Error("No auth code in OAuth callback");
  }
  if (returnedState !== state) {
    console.error("❌ [OAuth] CSRF State Mismatch!", { expected: state, received: returnedState });
    throw new Error(`OAuth state mismatch! Expected ${state}, got ${returnedState}`);
  }
  console.debug("[OAuth] Step 5: state matches");

  console.debug("[OAuth] Step 6: Exchanging code");
  try {
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";
    const redirectUri = `http://127.0.0.1:${port}`;
    const tokenText = await invoke<string>("exchange_google_code", {
      code,
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUri,
      codeVerifier: verifier,
    });
    console.debug("[OAuth] Token exchange successful");



    const tokens = JSON.parse(tokenText) as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (tokens.error) {
      console.error("[OAuth] Token exchange error:", tokens.error, tokens.error_description);
      throw new Error(tokens.error_description ?? tokens.error);
    }
    if (!tokens.id_token) throw new Error("No id_token in token response");

    if (tokens.refresh_token) {
      console.debug("[OAuth] Saving Google refresh_token...");
      saveRefreshToken(tokens.refresh_token);
    }

    // Step 7: Exchange Google ID Token for Firebase ID Token
    console.debug("[OAuth] Step 7: exchanging for Firebase token...");
    const firebaseResult = await exchangeGoogleIdTokenForFirebaseToken(tokens.id_token);
    if (firebaseResult.refreshToken) {
      saveFirebaseRefreshToken(firebaseResult.refreshToken);
    }

    // Step 8: Decode user info
    console.debug("[OAuth] Step 8: decoding user profile...");
    const googlePayload = decodeJwtPayload(tokens.id_token);

    const uid = firebaseResult.localId || String(googlePayload["sub"] ?? "");
    const email = String(googlePayload["email"] ?? "");
    const displayName = String(googlePayload["name"] ?? "");
    const photoURL = String(googlePayload["picture"] ?? "");

    return {
      user: { uid, email: email || null, displayName: displayName || null, photoURL: photoURL || null },
      accessToken: tokens.access_token ?? "",
      idToken: firebaseResult.idToken,
      firebaseRefreshToken: firebaseResult.refreshToken,
      premium: false, // will be checked by claims refresh
    };
  } catch (err) {
    console.error("🛑 [OAuth] Flow failed with error:", err);
    alert(`Giriş hatası: ${err instanceof Error ? err.message : String(err)}`);
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
