# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-11-24

### Added
- **Individual segment uncoding & inline Segment Popover:** Click any coded text/PDF passage or margin stripe to remove individual codes from that sentence without deleting the entire code, add extra codes, rate weight (1–5), or write/edit a segment memo; also added per-segment uncoding in the Right Panel
- **Code, Theme & Narrative Memos:** Added "Add Memo" action in the Floating Menu, inline editing/deletion in the Notes Panel, per-code/theme memo buttons in the Right Panel, and code/narrative linking + category filters in MemosPage
- **Formal Codebook (APA 7):** Added definition, inclusion criteria, exclusion criteria, and example/anchor quote fields on codes with a dedicated Codebook Drawer and one-click APA 7 Word (`.docx`) & HTML export
- **Mixed Methods Document Groups & Variable Activation:** Assign documents to groups, toggle individual document activation, or bulk-activate documents by variable/property values (`Document.properties`) — automatically applied across the Analysis Dashboard
- **Segment Weight Score (1–5):** Rate coded passages from 1–5 stars and filter Analysis views by minimum weight (`All / 3+ / 4+ / 5`)
- **Hardened REFI-QDA (`.qdpx` / `.qde`) MAXQDA & NVivo Migration:** Real `.qdpx` ZIP archive reader/writer (supporting external `plainTextPath="internal://..."` sources, `<Coding><CodeRef/>`, `<Variables>`/`<VariableValue>`, `<Sets>`/`<MemberSource>`, weights, and `<NoteRef>` code memos), wired into Left Panel import and Export Menu, with ZIP-bomb & XXE guards and unit tests

### Changed
- Refactored `anthropicProvider.ts` to reduce cyclomatic complexity and remove unnecessary `async` on `healthCheck()`
- Updated `COMPREHENSIVE_FEATURES.md` to reflect AGPL-3.0 free & open-source licensing
- Added 8-language translations (`en, tr, de, es, fr, it, nl, pt`) for all new features

## [1.4.2] - 2026-11-24

### Added
- Completed all missing translations across Turkish (`tr`), German (`de`), Spanish (`es`), French (`fr`), Italian (`it`), Dutch (`nl`), and Portuguese (`pt`) — 100% key parity across all 8 languages
- Enabled the 22 i18n completeness tests in Vitest and added Rust unit tests (`cargo test`) to CI
- Mac App Store build support (`build:appstore`, sandboxed entitlements, security-scoped folder bookmarks, and `VITE_APP_STORE` updater gating) unified onto `main`

### Changed
- Upgraded GitHub Actions workflow steps (`checkout`, `cache`, `setup-node`, `pnpm/action-setup`, `action-gh-release`) to Node 24–native versions
- Removed obsolete `updater.json` and `scripts/update-updater.js` targeting the legacy `QualityOpen-Releases` repository

## [1.4.1] - 2026-10-08

### Fixed
- Claude (Anthropic) AI features failed because the default model `claude-3-5-haiku` was retired on 2026-02-19; the default is now `claude-haiku-5-5`
- README download and clone links pointed to a placeholder repository

## [1.4.0] - 2026-06-17

### Added
- Local LLM support via Ollama — chat with on-device models; unified "Active source" picker switches cloud BYOK and local interchangeably
- Streaming AI responses with a Stop button, plus a privacy badge when a local provider is active
- Semantic search across documents — meaning-based retrieval, model picker (nomic-embed-text, mxbai-embed-large, bge-m3, OpenAI, Gemini), cross-document "find similar", and manual index management
- Notes panel for memos

### Changed
- Native window chrome: macOS traffic lights / Windows custom controls in the title bar
- Full internationalization sweep — all remaining hardcoded UI strings routed through the i18n system (8 languages)

### Fixed
- Semantic search returning irrelevant results for PDFs (now extracts real text instead of indexing base64)
- Title bar crowding/overlap; full-screen overlay header colliding with macOS traffic lights
- Toast notifications hidden behind panels

## [1.3.7] - 2026-04-30

### Fixed
- Updater system redesigned for reliability
- GitHub Actions Windows build failing due to Tauri signing key errors
- Empty version display in update notifications ("v undefined is available")
- Version mismatch between `package.json` (1.3.4) and `tauri.conf.json` (1.3.7)

### Changed
- Replaced Tauri plugin-updater with GitHub API-based update checker
- Update notifications now open GitHub release page in browser
- Simplified CI/CD workflow: removed updater artifact generation
- macOS build now uses local signing identity from keychain

### Removed
- `TAURI_PRIVATE_KEY` / `TAURI_KEY_PASSWORD` secrets requirement
- `latest.json` generation step in CI
- `createUpdaterArtifacts` configuration (now `false`)

---

## [1.3.4] - 2026-04-29

### Changed
- Project is now fully open-source under AGPL-3.0
- Removed all license/premium restrictions
- All features are now free: unlimited documents, unlimited mindmap nodes, unlimited file sizes
- AI features (chat, synthesis, summarization) available to all users
- Export features (Word, Excel, CSV, PNG, JPEG) available to all users
- Local folder sync available to all users

### Removed
- Lemon Squeezy license integration
- Pro/Free tier system
- Paywall page
- License activation modal
- Document count limits (was 3)
- File size limits (was 5MB)
- Mindmap node limits (was 5)
