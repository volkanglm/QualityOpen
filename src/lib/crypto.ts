/**
 * Simple XOR obfuscation for non-sensitive local storage.
 * Note: This is not secure encryption, but prevents trivial plaintext exposure.
 */

export function xorEncode(s: string, cipher: string): string {
    if (!s) return "";
    try {
        let r = "";
        for (let i = 0; i < s.length; i++)
            r += String.fromCharCode(s.charCodeAt(i) ^ cipher.charCodeAt(i % cipher.length));
        return btoa(r);
    } catch { return ""; }
}

export function xorDecode(e: string, cipher: string): string {
    if (!e) return "";
    try {
        const s = atob(e);
        let r = "";
        for (let i = 0; i < s.length; i++)
            r += String.fromCharCode(s.charCodeAt(i) ^ cipher.charCodeAt(i % cipher.length));
        return r;
    } catch { return ""; }
}

export const SETTINGS_CIPHER = "QO_v1_2024_QualityOpen_cipher_salt_desktop_app_key";
export const AUTH_CIPHER = "QO_rt_2024_refresh_salt_xor_key";
