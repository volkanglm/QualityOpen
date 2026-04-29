Project Handover Documentation: QualityOpen
1. Project Overview
QualityOpen is a sophisticated Research Tool designed for Thematic Analysis and Document Management. It features an Infinite Canvas for concept mapping, advanced data visualization (heatmaps, networks, clouds), and robust document processing capabilities.

2. Technology Stack
Framework: Tauri v2 (Desktop App Framework)
Frontend: React 19 + TypeScript
Build Tool: Vite 7
Styling: Tailwind CSS v4 + Framer Motion
State Management: Zustand
Canvas/Graphs: @xyflow/react (Infinite Canvas)
Database/Storage: IndexedDB (idb) + Local JSON Stores
Native/Rust: Custom Tauri commands for File System, Keychain (Keyring), and OS integration.
3. Recent Milestones (as of v1.3.3)
License System Migration: Moved from file-based storage to OS Keychain (Keyring) for enhanced security and persistence across updates.
Stable Machine UUID: Implemented a UUID-based hardware identification system that persists in the Keychain, preventing "new device" issues in Lemon Squeezy.
Project Import/Export: Fixed and improved the project restoration mechanism.
PDF Rendering: Fixed critical crashes in PDF text layer rendering and improved selection accuracy.
Localization (i18n): Comprehensive audit and integration of multi-language support (TR/EN).
4. Key Architecture & Components
src-tauri/: Rust backend, Tauri configuration, and native plugins.
src/store/: Centralized state management using Zustand (app, project, visualTheme, license).
src/components/canvas/: Logic for the Infinite Concept Map.
src/pages/AnalysisPage.tsx: The main analytics dashboard with multiple visualization tabs.
src/lib/i18n.tsx: Localization engine.
5. Getting Started (Development)
Install Dependencies: pnpm install
Run Dev Mode (Vite + Tauri): pnpm tauri dev
Build Application: pnpm tauri build
Run Tests: pnpm test
6. Important Files for Context
package.json: Frontend dependencies and scripts.
src-tauri/Cargo.toml: Rust dependencies and features.
src-tauri/src/main.rs: Entry point for native logic and command registration.
src/types/index.ts: Core data models (Project, Document, Code, Segment).
COMPREHENSIVE_FEATURES.md: Documentation of all available features.
7. Next Steps / Pending Work
Continue refining the Meta-Synthesis dashboard.
Monitor Keychain integration across different OS environments (macOS/Windows).
Further optimize the Infinite Canvas performance for very large projects.