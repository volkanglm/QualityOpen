# QualityOpen — App Store Review Notes

## Build command
The Mac App Store (MAS) build is produced ONLY with `pnpm build:appstore`. This single command sets BOTH the Rust `appstore` cargo feature (compiles out the self-updater plugin) AND `VITE_APP_STORE=true` (compiles out all frontend update UI/logic via `src-tauri/tauri.appstore.conf.json`'s `build.beforeBuildCommand`). Do not build the MAS artifact any other way.

Notes for the App Review team (paste into App Store Connect → App Review Information → Notes).

## About the app
QualityOpen is a free, open-source qualitative data analysis (QDA) tool. It is **completely free** and contains **no in-app purchases, no paywall, and no external purchase links** in this App Store build.

## Optional local AI (Ollama)
- The optional "Local AI" / local semantic search feature connects over HTTP to a **user-installed** Ollama server on `localhost` (default `http://localhost:11434`).
- The app does **not** download, bundle, or execute any external binary. Ollama, if used, is installed and run by the user separately.
- If Ollama is **not** installed, the app runs fully; only local semantic search is unavailable (graceful degradation). No feature crashes or blocks on its absence.

## Cloud AI (bring-your-own-key)
- Optional cloud AI features (OpenAI / Anthropic / Google) use the **user's own API key**, entered by the user in Settings. The app does not ship or distribute any API keys.

## Data & privacy
- All user project data is stored **locally** (browser IndexedDB) and, optionally, in a **user-selected folder** the user explicitly picks via the system file picker.
- Persistent access to that user-selected folder uses macOS **security-scoped bookmarks** (entitlement `com.apple.security.files.bookmarks.app-scope`), so access is limited to the folder the user chose.
- No analytics/tracking SDKs; no data is sold or shared.

## Sandbox / entitlements rationale
- `com.apple.security.app-sandbox` — required.
- `com.apple.security.network.client` — outbound HTTPS to user-configured AI providers and GitHub, plus localhost Ollama.
- `com.apple.security.network.server` — loopback (localhost) callback listener used only for the optional Google sign-in OAuth flow.
- `com.apple.security.files.user-selected.read-write` + `...bookmarks.app-scope` — reading imported documents (PDF/images) and writing exports / optional local-folder sync, all to user-selected locations.

## Updates
- This App Store build ships **without** the app's own updater; updates are delivered exclusively through the App Store. (The self-update mechanism exists only in the separate direct-download build and is compiled out here.)
