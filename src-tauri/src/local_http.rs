//! Local AI HTTP bridge.
//!
//! The general-purpose `native_http` command (in `lib.rs`) intentionally BLOCKS
//! loopback addresses via an HTTPS-only allowlist to prevent SSRF. Local AI
//! services (Ollama, llama.cpp, LM Studio, …) run on `http://127.0.0.1:<port>`,
//! so they need a separate, narrowly-sandboxed path.
//!
//! This module only ever permits loopback hosts on a small allowlist of ports,
//! and is the *only* place where plain-HTTP loopback requests are allowed.

use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Ports we are willing to talk to on loopback.
/// 11434 = Ollama, 8080 = llama.cpp server, 1234 = LM Studio, 7860 = text-generation-webui / Gradio.
const ALLOWED_PORTS: &[u16] = &[11434, 8080, 1234, 7860];

/// Loopback hostnames we accept.
const LOOPBACK_HOSTS: &[&str] = &["127.0.0.1", "localhost", "::1"];

// ─── Validation ───────────────────────────────────────────────────────────────

/// Pure (no-network) validator: the URL must be `http`/`https`, target a
/// loopback host, and use one of the allowed ports.
///
/// Parses host/port manually to avoid adding the `url` crate. Handles the
/// IPv6 bracket form `[::1]:11434` and infers the port from the scheme when
/// one is not present (http → 80, https → 443) — note that the default ports
/// are then checked against the allowlist and will normally be rejected, which
/// is intentional (callers must specify an allowed port explicitly).
fn validate_local_url(url: &str) -> Result<(), String> {
    // Scheme — only http/https allowed.
    let (scheme, rest) = if let Some(r) = url.strip_prefix("https://") {
        ("https", r)
    } else if let Some(r) = url.strip_prefix("http://") {
        ("http", r)
    } else {
        return Err(format!(
            "local_http: only http:// or https:// loopback URLs are allowed — got: {url}"
        ));
    };

    // Authority = everything before the first '/', '?', or '#'.
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
    if authority.is_empty() {
        return Err(format!("local_http: missing host in URL: {url}"));
    }

    // Strip optional userinfo ("user:pass@host") — disallow it, it's not
    // something a local AI URL legitimately needs and it complicates parsing.
    if authority.contains('@') {
        return Err(format!(
            "local_http: userinfo (user@host) is not allowed in local URLs: {url}"
        ));
    }

    // Split host / port, handling the IPv6 bracket form.
    let (host, port_opt): (String, Option<u16>) = if let Some(after_bracket) =
        authority.strip_prefix('[')
    {
        // [::1] or [::1]:port
        let close = after_bracket
            .find(']')
            .ok_or_else(|| format!("local_http: malformed IPv6 host: {url}"))?;
        let host = after_bracket[..close].to_string();
        let remainder = &after_bracket[close + 1..];
        let port = if let Some(p) = remainder.strip_prefix(':') {
            Some(
                p.parse::<u16>()
                    .map_err(|_| format!("local_http: invalid port: {url}"))?,
            )
        } else if remainder.is_empty() {
            None
        } else {
            return Err(format!("local_http: malformed IPv6 authority: {url}"));
        };
        (host, port)
    } else {
        // host or host:port (host is a name or IPv4 — no colons expected).
        let mut parts = authority.splitn(2, ':');
        let host = parts.next().unwrap_or("").to_string();
        let port = match parts.next() {
            Some(p) => Some(
                p.parse::<u16>()
                    .map_err(|_| format!("local_http: invalid port: {url}"))?,
            ),
            None => None,
        };
        (host, port)
    };

    // Host must be loopback.
    if !LOOPBACK_HOSTS.iter().any(|&h| h == host) {
        return Err(format!(
            "local_http: host not allowed — only loopback ({}) permitted, got '{host}'",
            LOOPBACK_HOSTS.join(", ")
        ));
    }

    // Port must be on the allowlist. Infer default from scheme when absent.
    let port = port_opt.unwrap_or(if scheme == "https" { 443 } else { 80 });
    if !ALLOWED_PORTS.contains(&port) {
        return Err(format!(
            "local_http: port {port} not allowed — permitted ports: {ALLOWED_PORTS:?}"
        ));
    }

    Ok(())
}

/// Parse `headers_json` (a JSON object string, or empty) into key/value pairs.
fn parse_headers(headers_json: &str) -> Result<std::collections::HashMap<String, String>, String> {
    if headers_json.trim().is_empty() {
        return Ok(std::collections::HashMap::new());
    }
    serde_json::from_str(headers_json).map_err(|e| format!("Invalid headers JSON: {e}"))
}

/// Build a reqwest request builder for the given verb.
fn request_builder(
    client: &reqwest::Client,
    method: &str,
    url: &str,
) -> Result<reqwest::RequestBuilder, String> {
    Ok(match method.to_uppercase().as_str() {
        "POST" => client.post(url),
        "GET" => client.get(url),
        "PATCH" => client.patch(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        other => return Err(format!("Unsupported HTTP method: {other}")),
    })
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// Non-streaming request to a LOCAL AI service over loopback.
/// Returns (status_code, response_body_text).
#[tauri::command]
pub async fn local_http(
    method: String,
    url: String,
    headers_json: String,
    body: String,
) -> Result<(u16, String), String> {
    validate_local_url(&url)?;

    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        // Local model generations can run long; be generous.
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let headers_map = parse_headers(&headers_json)?;

    let mut builder = request_builder(&client, &method, &url)?;
    for (key, val) in &headers_map {
        builder = builder.header(key, val);
    }
    if !body.is_empty() {
        builder = builder.body(body);
    }

    let response = builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;
    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read body: {e}"))?;

    Ok((status, text))
}

/// Streaming request to a LOCAL AI service. Emits Tauri events on the channel
/// `local-stream://<req_id>` with payloads:
///   { "type": "chunk", "data": "<line>" }   for each NDJSON line
///   { "type": "done" }                       on success
///   { "type": "error", "message": "<msg>" }  on failure (also returns Err)
///
/// Streaming approach: the project's reqwest is built WITHOUT the `stream`
/// feature (only `native-tls` + `json`), so `Response::bytes_stream()` is not
/// available, and `futures-util` is not a direct dependency. We therefore use
/// the **line-split fallback**: await the full body, then split it into lines
/// and emit each line as a chunk. This adds no new dependencies. (If the crate
/// later enables reqwest's `stream` feature + `futures-util`, this can be
/// upgraded to true incremental `bytes_stream()` streaming.)
#[tauri::command]
pub async fn local_http_stream(
    app: AppHandle,
    req_id: String,
    method: String,
    url: String,
    headers_json: String,
    body: String,
) -> Result<(), String> {
    let channel = format!("local-stream://{req_id}");

    // Helper to emit an error event AND produce the Err return value.
    let emit_err = |app: &AppHandle, channel: &str, msg: String| -> String {
        let _ = app.emit(
            channel,
            serde_json::json!({ "type": "error", "message": msg }),
        );
        msg
    };

    if let Err(e) = validate_local_url(&url) {
        return Err(emit_err(&app, &channel, e));
    }

    let client = match reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return Err(emit_err(
                &app,
                &channel,
                format!("Failed to build HTTP client: {e}"),
            ))
        }
    };

    let headers_map = match parse_headers(&headers_json) {
        Ok(m) => m,
        Err(e) => return Err(emit_err(&app, &channel, e)),
    };

    let mut builder = match request_builder(&client, &method, &url) {
        Ok(b) => b,
        Err(e) => return Err(emit_err(&app, &channel, e)),
    };
    for (key, val) in &headers_map {
        builder = builder.header(key, val);
    }
    if !body.is_empty() {
        builder = builder.body(body);
    }

    let response = match builder.send().await {
        Ok(r) => r,
        Err(e) => return Err(emit_err(&app, &channel, format!("Request failed: {e}"))),
    };

    let text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return Err(emit_err(
                &app,
                &channel,
                format!("Failed to read body: {e}"),
            ))
        }
    };

    // NDJSON: one JSON object per line. Skip empty lines.
    for line in text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if let Err(e) = app.emit(
            &channel,
            serde_json::json!({ "type": "chunk", "data": line }),
        ) {
            return Err(emit_err(
                &app,
                &channel,
                format!("Failed to emit chunk: {e}"),
            ));
        }
    }

    app.emit(&channel, serde_json::json!({ "type": "done" }))
        .map_err(|e| emit_err(&app, &channel, format!("Failed to emit done: {e}")))?;

    Ok(())
}

/// Health/status of a local AI service.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAiHealth {
    pub status: String,
    pub latency_ms: u64,
    pub models_available: Vec<String>,
}

/// Probe a local AI service by GETting `{base_url}/api/tags` (Ollama's model
/// list endpoint). Reports latency and, when reachable, the available models.
///
/// status:
///   "healthy"    — reachable and returned a 2xx
///   "degraded"   — reachable but returned a non-2xx status
///   "unreachable"— request failed (connection refused, timeout, …)
#[tauri::command]
pub async fn local_ai_health(base_url: String) -> Result<LocalAiHealth, String> {
    // Validate the base URL itself (loopback + allowed port).
    validate_local_url(&base_url)?;

    let endpoint = format!("{}/api/tags", base_url.trim_end_matches('/'));

    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let start = Instant::now();
    let result = client.get(&endpoint).send().await;
    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Err(_) => Ok(LocalAiHealth {
            status: "unreachable".to_string(),
            latency_ms,
            models_available: Vec::new(),
        }),
        Ok(response) => {
            let ok = response.status().is_success();
            if !ok {
                return Ok(LocalAiHealth {
                    status: "degraded".to_string(),
                    latency_ms,
                    models_available: Vec::new(),
                });
            }

            // Parse Ollama's { "models": [ { "name": "..." }, ... ] }.
            let models_available = match response.json::<serde_json::Value>().await {
                Ok(json) => json
                    .get("models")
                    .and_then(|m| m.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|m| {
                                m.get("name").and_then(|n| n.as_str()).map(String::from)
                            })
                            .collect()
                    })
                    .unwrap_or_default(),
                Err(_) => Vec::new(),
            };

            Ok(LocalAiHealth {
                status: "healthy".to_string(),
                latency_ms,
                models_available,
            })
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loopback_hosts_accepted() {
        assert!(validate_local_url("http://127.0.0.1:11434").is_ok());
        assert!(validate_local_url("http://localhost:11434/api/tags").is_ok());
        assert!(validate_local_url("http://[::1]:11434").is_ok());
        assert!(validate_local_url("http://[::1]:8080/v1/chat").is_ok());
    }

    #[test]
    fn non_loopback_host_rejected() {
        assert!(validate_local_url("http://evil.com:11434").is_err());
        assert!(validate_local_url("http://192.168.1.5:11434").is_err());
        assert!(validate_local_url("https://api.openai.com:8080").is_err());
        // 127.0.0.1 lookalike that is NOT in the allowlist.
        assert!(validate_local_url("http://127.0.0.2:11434").is_err());
    }

    #[test]
    fn allowed_ports_accepted() {
        for port in [11434u16, 8080, 1234, 7860] {
            let url = format!("http://127.0.0.1:{port}");
            assert!(validate_local_url(&url).is_ok(), "port {port} should pass");
        }
    }

    #[test]
    fn disallowed_port_rejected() {
        assert!(validate_local_url("http://127.0.0.1:9999").is_err());
        assert!(validate_local_url("http://localhost:3000").is_err());
        // No explicit port → infers 80, which is not on the allowlist.
        assert!(validate_local_url("http://127.0.0.1/api/tags").is_err());
    }

    #[test]
    fn both_http_and_https_loopback_accepted() {
        assert!(validate_local_url("http://127.0.0.1:11434").is_ok());
        assert!(validate_local_url("https://127.0.0.1:11434").is_ok());
        assert!(validate_local_url("https://localhost:8080").is_ok());
    }

    #[test]
    fn non_http_schemes_rejected() {
        assert!(validate_local_url("ftp://127.0.0.1:11434").is_err());
        assert!(validate_local_url("file:///etc/passwd").is_err());
        assert!(validate_local_url("127.0.0.1:11434").is_err());
    }

    #[test]
    fn userinfo_rejected() {
        assert!(validate_local_url("http://user:pass@127.0.0.1:11434").is_err());
    }

    #[test]
    fn malformed_port_rejected() {
        assert!(validate_local_url("http://127.0.0.1:notaport").is_err());
    }
}
