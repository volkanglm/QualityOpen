# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
