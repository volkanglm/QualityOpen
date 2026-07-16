#!/usr/bin/env bash
#
# QualityOpen — Mac App Store sign + package + upload
# ---------------------------------------------------
# Run this AFTER `pnpm build:appstore` has produced the .app, and AFTER you have:
#   1. "Apple Distribution" certificate in your login keychain
#   2. "Apple Distribution" (aka "3rd Party Mac Developer Installer" / "Mac
#      Installer Distribution") installer certificate in your login keychain
#   3. A Mac App Store provisioning profile for com.ivg.qualityopen
#   4. An app-specific password (appleid.apple.com → App-Specific Passwords)
#
# Usage:
#   export ASC_APPLE_ID="volkanglm@gmail.com"
#   export ASC_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # app-specific password
#   export MAS_PROFILE="/absolute/path/to/QualityOpen_MAS.provisionprofile"
#   ./scripts/appstore-sign-upload.sh            # signs + packages + VALIDATES
#   ./scripts/appstore-sign-upload.sh --upload   # also uploads to App Store Connect
#
set -euo pipefail

# ── Config (Team ID auto-detected from your keychain) ────────────────────────
TEAM_ID="R2SG7U8DN9"
APP_CERT="${MAS_APP_CERT:-Apple Distribution: ismail volkan gulum ($TEAM_ID)}"
# Installer cert common name is usually one of these — override with MAS_INSTALLER_CERT if needed:
INSTALLER_CERT="${MAS_INSTALLER_CERT:-3rd Party Mac Developer Installer: ismail volkan gulum ($TEAM_ID)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="${MAS_APP:-$REPO_ROOT/src-tauri/target/universal-apple-darwin/release/bundle/macos/QualityOpen.app}"
ENTITLEMENTS="$REPO_ROOT/src-tauri/Entitlements.appstore.plist"
PKG="$REPO_ROOT/QualityOpen.pkg"
DO_UPLOAD="no"
[[ "${1:-}" == "--upload" ]] && DO_UPLOAD="yes"

fail() { echo "❌ $1" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────────────
echo "▶ Preflight checks…"
[[ -d "$APP" ]] || fail "App not found: $APP  (run 'pnpm build:appstore' first)"
[[ -f "$ENTITLEMENTS" ]] || fail "Entitlements not found: $ENTITLEMENTS"
security find-identity -v -p codesigning | grep -qF "$APP_CERT" \
  || fail "Signing cert not in keychain: '$APP_CERT'. Create 'Apple Distribution' at developer.apple.com and download it. Override name with MAS_APP_CERT=…"
security find-identity -v | grep -qF "$INSTALLER_CERT" \
  || fail "Installer cert not in keychain: '$INSTALLER_CERT'. Create the Mac Installer Distribution cert. Override name with MAS_INSTALLER_CERT=…"
: "${MAS_PROFILE:?Set MAS_PROFILE=/path/to/QualityOpen_MAS.provisionprofile (download the Mac App Store provisioning profile from developer.apple.com)}"
[[ -f "$MAS_PROFILE" ]] || fail "Provisioning profile not found: $MAS_PROFILE"
echo "  ✓ app, entitlements, both certs, and provisioning profile present."

# ── Embed provisioning profile + sign the .app ───────────────────────────────
echo "▶ Embedding provisioning profile…"
cp "$MAS_PROFILE" "$APP/Contents/embedded.provisionprofile"

echo "▶ Signing app bundle…"
codesign --force --sign "$APP_CERT" \
  --entitlements "$ENTITLEMENTS" \
  --options runtime --timestamp --deep "$APP"

echo "▶ Verifying signature + sandbox…"
codesign -dv --entitlements :- "$APP" 2>&1 | grep -q "com.apple.security.app-sandbox" \
  || fail "Signed app is missing the app-sandbox entitlement."
codesign --verify --deep --strict --verbose=2 "$APP" && echo "  ✓ signature valid, sandbox present."

# ── Build the signed installer .pkg ──────────────────────────────────────────
echo "▶ Building signed .pkg…"
rm -f "$PKG"
productbuild --component "$APP" /Applications --sign "$INSTALLER_CERT" "$PKG"
echo "  ✓ $PKG"

# ── Validate (and optionally upload) via altool ──────────────────────────────
: "${ASC_APPLE_ID:?Set ASC_APPLE_ID=your-apple-id-email}"
: "${ASC_APP_PASSWORD:?Set ASC_APP_PASSWORD=app-specific-password}"

echo "▶ Validating with App Store Connect…"
xcrun altool --validate-app -f "$PKG" -t macos \
  -u "$ASC_APPLE_ID" -p "$ASC_APP_PASSWORD"
echo "  ✓ validation passed."

if [[ "$DO_UPLOAD" == "yes" ]]; then
  echo "▶ Uploading to App Store Connect…"
  xcrun altool --upload-app -f "$PKG" -t macos \
    -u "$ASC_APPLE_ID" -p "$ASC_APP_PASSWORD"
  echo "✅ Uploaded. Finish metadata/screenshots/privacy in App Store Connect, then Submit for Review."
else
  echo "ℹ️  Validation only. Re-run with --upload to submit the build to App Store Connect."
fi
