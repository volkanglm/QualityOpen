/**
 * nativeHttp.ts — Bypass WKWebView fetch restrictions in production builds.
 *
 * All external HTTP requests go through Tauri's Rust `native_http` command
 * (which uses reqwest) instead of the browser's fetch(). This avoids silent
 * hangs caused by CORS / tauri://localhost origin issues in WKWebView.
 */
import { invoke } from "@tauri-apps/api/core";

export interface NativeHttpOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

export interface NativeHttpResponse {
  status: number;
  body: string;
}

/**
 * Make an HTTP request via Rust (reqwest). Works identically in dev and prod.
 * Throws on network errors; does NOT throw on non-2xx status codes —
 * the caller decides how to handle those.
 */
export async function nativeHttp(
  url: string,
  options: NativeHttpOptions = {},
): Promise<NativeHttpResponse> {
  const method = options.method ?? "GET";
  const headers = options.headers ?? {};
  const body = options.body ?? "";

  const [status, text] = await invoke<[number, string]>("native_http", {
    method,
    url,
    headersJson: JSON.stringify(headers),
    body,
  });

  return { status, body: text };
}
