# 🏆 QualityOpen Gold Standards Registry

This document records the "Gold Standard" versions of the application—releases that have been thoroughly audited, stabilized, and verified for production use.

## [v1.3.2] — 2026-03-27 (Current Gold Standard)
**Git Tag**: `v1.3.2-gold` / `v1.3.2`

### Why this is a Gold Standard:
- **Full Stability Suite**: Resolves all v1.3.1 build regressions (Export failures, CSS parsing crashes).
- **Native OS Integration**: Correctly implements Tauri native "Save As" dialogs and Mac filesystem permissions (`mkdir`, `stat`).
- **Data Integrity**: Comprehensive backup/sync coverage for all features (Maps, Reflexivity, Audit Logs, Protocol Versions).
- **Security Audited**: Verified CSP, selection guards, and data sanitization.

---
*To revert to this version*:
`git checkout v1.3.2-gold`
