//! macOS security-scoped bookmarks.
//!
//! The Mac App Store build runs inside the App Sandbox. A raw path a user
//! picks once (e.g. a sync folder) is NOT accessible on the next launch —
//! the sandbox only grants persistent access via a *security-scoped
//! bookmark*. These two commands let the frontend:
//!   1. create a bookmark from a user-selected folder path, and
//!   2. resolve that bookmark back into a usable path on a later launch,
//!      re-acquiring sandbox access.
//!
//! Requires the entitlements
//!   com.apple.security.files.bookmarks.app-scope
//!   com.apple.security.files.user-selected.read-write
//! (already present in Entitlements.appstore.plist).

use objc2::runtime::Bool;
use objc2_foundation::{
    NSData, NSString, NSURL, NSURLBookmarkCreationOptions, NSURLBookmarkResolutionOptions,
};

/// Create a security-scoped bookmark for `path`.
///
/// Returns the raw bookmark bytes, which the frontend stores (serialized to
/// JS as a number array) and passes back to `resolve_bookmark` on the next
/// launch. Uses the `WithSecurityScope` creation option so the bookmark
/// survives across app launches inside the sandbox.
#[tauri::command]
pub fn create_bookmark(path: String) -> Result<Vec<u8>, String> {
    let ns_path = NSString::from_str(&path);
    // NSURL for the file path. `fileURLWithPath` never returns null for a
    // non-empty string, but objc2 hands us a `Retained<NSURL>` directly.
    let url = NSURL::fileURLWithPath(&ns_path);

    // Security-scoped, app-scope bookmark. No resource keys, no base URL.
    let data: objc2::rc::Retained<NSData> = url
        .bookmarkDataWithOptions_includingResourceValuesForKeys_relativeToURL_error(
            NSURLBookmarkCreationOptions::WithSecurityScope,
            None,
            None,
        )
        .map_err(|e| format!("Failed to create bookmark for '{path}': {e}"))?;

    Ok(data.to_vec())
}

/// Resolve a security-scoped bookmark back into a filesystem path.
///
/// Rebuilds the `NSData` from the raw bytes, resolves it with the
/// `WithSecurityScope` option, then calls
/// `startAccessingSecurityScopedResource` and *leaves access started* for the
/// remainder of the app session (the frontend never stops it explicitly).
/// Returns the resolved path, or an `Err` if the bookmark is stale or
/// resolution otherwise fails.
#[tauri::command]
pub fn resolve_bookmark(bookmark: Vec<u8>) -> Result<String, String> {
    if bookmark.is_empty() {
        return Err("resolve_bookmark: empty bookmark data".to_string());
    }

    let data = NSData::with_bytes(&bookmark);
    let mut is_stale = Bool::new(false);

    let url: objc2::rc::Retained<NSURL> = unsafe {
        NSURL::URLByResolvingBookmarkData_options_relativeToURL_bookmarkDataIsStale_error(
            &data,
            NSURLBookmarkResolutionOptions::WithSecurityScope,
            None,
            &mut is_stale,
        )
    }
    .map_err(|e| format!("Failed to resolve bookmark: {e}"))?;

    if is_stale.as_bool() {
        return Err("resolve_bookmark: bookmark is stale — folder must be re-selected".to_string());
    }

    // Begin (and leave) access to the security-scoped resource for the app
    // session. Without this the returned path is not readable in the sandbox.
    let started = unsafe { url.startAccessingSecurityScopedResource() };
    if !started {
        return Err(
            "resolve_bookmark: startAccessingSecurityScopedResource returned false".to_string(),
        );
    }

    match url.path() {
        Some(p) => Ok(p.to_string()),
        None => Err("resolve_bookmark: resolved URL has no filesystem path".to_string()),
    }
}
