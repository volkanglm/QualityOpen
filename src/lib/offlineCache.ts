/**
 * offlineCache.ts — AES-GCM encrypted auth cache (IndexedDB)
 *
 * Stores user profile locally so the app works
 * without internet for up to 7 days after the last successful
 * online session.
 *
 * Encryption key: 256-bit random, stored in localStorage.
 * Not secret from OS-level access, but protects against casual
 * file-system inspection and automated scraping.
 */
import { openDB } from "idb";

// ─── Config ────────────────────────────────────────────────────────────────────

const DB_NAME    = "qo_auth_v1";
const STORE_NAME = "session";
const RECORD_KEY = "current";
const LS_EK      = "qo_ck";               // encryption key in localStorage
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CachedAuth {
  uid:         string;
  email:       string | null;
  displayName: string | null;
  photoURL:    string | null;
  cachedAt:    number;
}

// ─── Crypto helpers ────────────────────────────────────────────────────────────

async function getOrCreateKey(): Promise<CryptoKey> {
  let b64 = localStorage.getItem(LS_EK);
  if (!b64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    b64 = btoa(String.fromCharCode(...raw));
    localStorage.setItem(LS_EK, b64);
  }
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(plain: string, key: CryptoKey): Promise<string> {
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipher  = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const out     = new Uint8Array(12 + cipher.byteLength);
  out.set(iv);
  out.set(new Uint8Array(cipher), 12);
  return btoa(String.fromCharCode(...out));
}

async function decrypt(b64: string, key: CryptoKey): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}

// ─── DB helper ─────────────────────────────────────────────────────────────────

function openCacheDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function saveAuthCache(
  data: Omit<CachedAuth, "cachedAt">,
): Promise<void> {
  const key       = await getOrCreateKey();
  const payload   = JSON.stringify({ ...data, cachedAt: Date.now() });
  const encrypted = await encrypt(payload, key);
  const db        = await openCacheDB();
  await db.put(STORE_NAME, encrypted, RECORD_KEY);
}

export async function loadAuthCache(): Promise<CachedAuth | null> {
  try {
    const db        = await openCacheDB();
    const encrypted = await db.get(STORE_NAME, RECORD_KEY) as string | undefined;
    if (!encrypted) return null;

    const key  = await getOrCreateKey();
    const json = await decrypt(encrypted, key);
    const data = JSON.parse(json) as CachedAuth;

    if (Date.now() - data.cachedAt > TTL_MS) {
      await db.delete(STORE_NAME, RECORD_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function clearAuthCache(): Promise<void> {
  try {
    const db = await openCacheDB();
    await db.delete(STORE_NAME, RECORD_KEY);
  } catch {
    // ignore — best effort
  }
}
