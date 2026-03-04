use std::io::{Read, Write};
use std::net::TcpListener;
use tauri::{AppHandle, Emitter};

/// Starts a one-shot HTTP server on a dynamically assigned loopback port.
/// The OS picks a free port (bind to 0), so this never fails due to a
/// port being in TIME_WAIT after a previous auth attempt.
/// When the OAuth callback arrives, emits "oauth-callback" with the full URL.
#[tauri::command]
fn start_oauth_listener(app: AppHandle) -> Result<u16, String> {
    use std::net::SocketAddr;

    // Bind to port 0 — the OS picks a free port reliably, no TIME_WAIT issues
    let addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    let listener =
        TcpListener::bind(addr).map_err(|e| format!("Failed to bind OAuth listener: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get listener address: {e}"))?
        .port();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 8192];
            let n = stream.read(&mut buf).unwrap_or(0);
            let req = String::from_utf8_lossy(&buf[..n]);

            // Extract path from HTTP request line: "GET /path?query HTTP/1.1"
            let path = req
                .lines()
                .next()
                .and_then(|l| l.split_whitespace().nth(1))
                .unwrap_or("/");

            let callback_url = format!("http://127.0.0.1:{port}{path}");

            // Emit the event BEFORE writing the HTTP response so the main window
            // receives oauth-callback before the auth window closes.
            let _ = app.emit("oauth-callback", callback_url);

            let html = "\
                <html><head><title>QualityOpen</title></head>\
                <body style=\"font-family:system-ui;text-align:center;padding-top:80px;background:#09090b;color:#fafafa\">\
                <h2 style=\"font-weight:600\">✓ Giriş başarılı</h2>\
                <p style=\"color:#a1a1aa\">QualityOpen'a dönebilirsiniz. Bu sekmeyi kapatabilirsiniz.</p>\
                </body></html>";

            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                html.len(),
                html
            );
        }
    });

    Ok(port)
}

// ─── Security helpers ─────────────────────────────────────────────────────────

/// Returns true only if the URL is HTTPS and the host is in the hard-coded
/// allowlist.  Prevents SSRF: a compromised web context cannot use
/// `native_http` to reach internal services (127.0.0.1, metadata endpoints…).
fn is_url_allowed(url: &str) -> bool {
    // Must be HTTPS — no plain HTTP, no file://, no ftp://…
    let rest = match url.strip_prefix("https://") {
        Some(r) => r,
        None => return false,
    };
    // Extract the host portion (everything before the first '/', '?', or '#')
    let host_port = rest.split(['/', '?', '#']).next().unwrap_or("");
    // Strip optional port number
    let host = host_port.split(':').next().unwrap_or("");

    const ALLOWED_HOSTS: &[&str] = &[
        // Google OAuth / token exchange
        "oauth2.googleapis.com",
        // Firebase Auth (Identity Toolkit)
        "identitytoolkit.googleapis.com",
        // Firebase token refresh (Secure Token Service)
        "securetoken.googleapis.com",
        // Google APIs (Drive, etc.)
        "www.googleapis.com",
        // Gemini AI
        "generativelanguage.googleapis.com",
        // OpenAI
        "api.openai.com",
        // Anthropic Claude
        "api.anthropic.com",
        // Lemon Squeezy licensing
        "api.lemonsqueezy.com",
    ];

    ALLOWED_HOSTS
        .iter()
        .any(|&allowed| host == allowed || host.ends_with(&format!(".{}", allowed)))
}

/// Makes an HTTP POST/GET via native reqwest (bypasses WKWebView body-read hangs).
/// Returns (status_code, response_body_text).
#[tauri::command]
async fn native_http(
    method: String,
    url: String,
    headers_json: String,
    body: String,
) -> Result<(u16, String), String> {
    // ── Security: SSRF allowlist check ───────────────────────────────────────
    if !is_url_allowed(&url) {
        return Err(format!(
            "native_http: URL not in allowlist — request blocked: {}",
            url
        ));
    }
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let headers_map: std::collections::HashMap<String, String> =
        serde_json::from_str(&headers_json).map_err(|e| format!("Invalid headers JSON: {e}"))?;

    let mut builder = match method.to_uppercase().as_str() {
        "POST" => client.post(&url),
        "GET" => client.get(&url),
        "PATCH" => client.patch(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        other => return Err(format!("Unsupported HTTP method: {other}")),
    };

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

/// Exchange Google auth code for tokens. Returns JSON with id_token, access_token, refresh_token.
/// signInWithIdp is handled on the JS side via XMLHttpRequest.
#[tauri::command]
async fn exchange_google_code(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
    code_verifier: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("client: {e}"))?;

    let res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("token exchange: {e}"))?;

    let text = res.text().await.map_err(|e| format!("body: {e}"))?;
    Ok(text)
}

/// Read a file from an absolute path and return its contents as a base64 string.
/// Used by the drag-and-drop file import handler (Tauri file-drop events provide paths, not File objects).
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    // ── Security: path traversal guard ───────────────────────────────────────
    // Reject any path that contains `../` or `..\` sequences so that a crafted
    // drag-and-drop event cannot escape the intended directory.
    if path.contains("../")
        || path.contains("..\\")
        || path.contains("/..")
        || path.contains("\\..")
    {
        return Err("read_file_base64: path traversal not allowed".to_string());
    }

    // ── Security: file-extension allowlist ───────────────────────────────────
    // Only permit the document / media types the app legitimately imports.
    // This prevents reading sensitive files such as /etc/passwd or SSH keys
    // even if a carefully crafted drag-and-drop path is supplied.
    const ALLOWED_EXTS: &[&str] = &[
        "pdf", "docx", "doc", "txt", "csv", "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp",
        "mp4", "mov", "webm", "avi", "mkv",
    ];
    let path_lower = path.to_lowercase();
    let has_allowed_ext = ALLOWED_EXTS
        .iter()
        .any(|ext| path_lower.ends_with(&format!(".{}", ext)));

    if !has_allowed_ext {
        return Err(
            "read_file_base64: file type not allowed — only documents, images, and videos are supported"
                .to_string(),
        );
    }

    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read \"{path}\": {e}"))?;
    Ok(encode_base64(&bytes))
}

/// Minimal RFC 4648 base64 encoder — no external crate needed.
fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(((bytes.len() + 2) / 3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);
        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_oauth_listener,
            read_file_base64,
            native_http,
            exchange_google_code
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
