/**
 * Extract `code` and `state` from an OAuth redirect URL. Works for both the
 * legacy loopback shape (http://127.0.0.1:PORT/?...) and custom-scheme shapes
 * (com.googleusercontent.apps.X:/oauth2redirect?... or qualityopen://oauth?...).
 * Custom schemes don't parse cleanly through `new URL().searchParams` in every
 * runtime, so we read the query string directly.
 */
export function parseOAuthCallback(url: string): { code: string; state: string } {
  const qIndex = url.indexOf("?");
  const query = qIndex >= 0 ? url.slice(qIndex + 1) : "";
  const params = new URLSearchParams(query);
  const code = params.get("code");
  if (!code) {
    throw new Error("No auth code in OAuth callback");
  }
  return { code, state: params.get("state") ?? "" };
}
