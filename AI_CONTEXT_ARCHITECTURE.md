# AI Context: QualityOpen Proje Mimarisi

> Bu dosya, bir AI asistaninin projeyi sifirdan anlamasi icin hazirlanmistir.
> QualityOpen v1.3.7 — Nitel Veri Analiz Platformu (QDA)

---

## 1. Proje Ozeti

QualityOpen, nitel arastirma verilerini analiz etmek icin kullanilan bir masaustu aplikasyondur. NVivo, ATLAS.ti ve MAXQDA gibi ticari QDA araclarina open-source alternatiftir.

**Platformlar:** macOS (.dmg, .app) ve Windows (.nsis) — Tauri v2 ile derlenir.

---

## 2. Tech Stack

### Frontend
| Teknoloji | Surum | Aciklama |
|-----------|-------|----------|
| React | ^19.1.0 | UI framework |
| TypeScript | ~5.8 | Tip sistemi (strict mode) |
| Vite | ^7.0 | Build tool, dev server |
| Tailwind CSS | ^4.2 | Utility-first CSS (v4 yeni syntax) |
| Zustand | ^5.0 | State management |
| Framer Motion | ^12 | Animasyonlar |
| @xyflow/react | ^12.10 | Graf/canvas kutuphanesi (React Flow) |
| Recharts | ^3.7 | Grafikler |
| Lucide React | ^0.575 | Ikon kutuphanesi |
| idb | ^8.0 | IndexedDB wrapper |
| d3-force | ^3.0 | Force-directed layout (devDependency, henuz kullanilmadi) |
| pdfjs-dist | ^5.4 | PDF renderer |
| tesseract.js | ^7.0 | OCR |

### Backend / Desktop
| Teknoloji | Aciklama |
|-----------|----------|
| Tauri v2 | Rust tabanli masaustu framework |
| Firebase | Auth, Firestore (sync) |
| IndexedDB | Offline-first kalici veri saklama |
| GitHub API | Update checker (releases/latest endpoint) |

### Paket Yonetimi
- **pnpm** (pnpm-lock.yaml mevcut)

---

## 3. Dizin Yapisi

```
QualityOpenQDA/
├── src/                          # Frontend kaynak kodu
│   ├── App.tsx                   # Ana uygulama bileşeni (routing, error boundary, D&D)
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Global stiller + Tailwind
│   ├── components/
│   │   ├── canvas/               # ★ MINDMAP: Dugum, kenar, AssetsPanel
│   │   ├── ConceptMapBoard.tsx   # ★ MINDMAP: Ana canvas bileşeni
│   │   ├── charts/               # Analiz grafikleri (ThematicNetwork, vb.)
│   │   ├── analysis/             # Analiz bilesenleri
│   │   ├── editor/               # Dokuman editoru (PDF, metin)
│   │   ├── chat/                 # AI chat paneli
│   │   ├── command/              # CMD+K command palette
│   │   ├── keyboard/             # ShortcutEngine (global klavye)
│   │   ├── landing/              # Landing page
│   │   ├── layout/               # TitleBar, PanelLayout, PanelResizer
│   │   ├── media/                # Video/gorsel workspace
│   │   ├── modals/               # LicenseModal, SyncConflictDialog
│   │   ├── onboarding/           # WelcomeScreen
│   │   ├── panels/               # LeftPanel, CenterPanel, RightPanel
│   │   ├── sync/                 # Sync bilesenleri
│   │   ├── ui/                   # Button, Modal, Toast, Tooltip, vb.
│   │   └── workspace/            # ImageWorkspace, MediaWorkspace
│   ├── store/
│   │   ├── app.store.ts          # UI state (aktif proje, view, tema, panel genislikleri)
│   │   ├── project.store.ts      # Domain data (projeler, dokumanlar, kodlar, segmentler, conceptMaps)
│   │   ├── auth.store.ts         # Firebase auth state
│   │   ├── settings.store.ts     # API key'ler, ayarlar
│   │   ├── sync.store.ts         # Google Drive sync state
│   │   ├── toast.store.ts        # Bildirim state
│   │   ├── update.store.ts       # GitHub API-based update checker
│   │   └── visualTheme.store.ts  # Gorsel tema ayarlari
│   ├── types/
│   │   └── index.ts              # Tum TypeScript interface'leri
│   ├── lib/
│   │   ├── i18n.ts               # Uluslararasilastirma (8 dil)
│   │   ├── utils.ts              # cn(), formatDate(), countWords(), vb.
│   │   ├── constants.ts          # CODE_COLORS, APP_NAME, NAV_ITEMS
│   │   ├── storage.ts            # IndexedDB Zustand persist adapter
│   │   ├── db.ts                 # IndexedDB meta operations
│   │   ├── firebase.ts           # Firebase init + OAuth PKCE flow
│   │   ├── license.ts            # Lisans yardimcilari
│   │   ├── fileImport.ts         # Dosya import mantigi
│   │   ├── graph.utils.ts        # Graf yardimci fonksiyonlari
│   │   ├── tree.ts               # Agac yapisi yardimcilari
│   │   ├── colors.ts             # Renk yardimcilari
│   │   ├── crypto.ts             # Sifreleme yardimcilari
│   │   ├── exportChart.ts        # Grafik export
│   │   ├── exportData.ts         # Veri export
│   │   ├── exportUtils.ts        # Export yardimcilari
│   │   ├── exportWord.ts         # Word export
│   │   ├── localSync.ts          # Lokal klasor senkronizasyonu
│   │   ├── nativeHttp.ts         # Native HTTP istemcisi
│   │   ├── offlineCache.ts       # Offline onbellege alma
│   │   ├── qdpx.ts               # QDPX format import/export
│   │   └── ai.ts                 # AI servis entegrasyonu
│   ├── hooks/
│   │   ├── useNetwork.ts         # Ag durumu hook
│   │   ├── useResizable.ts       # Panel boyutlandirma hook
│   │   └── useT.ts               # i18n hook
│   ├── locales/                  # 8 dil destegi (tr, en, de, es, nl, fr, it, pt)
│   ├── data/                     # Sabit veri (features.ts)
│   ├── dev-tools/                # Mock data, Studio Director
│   └── pages/                    # Sayfa bilesenleri (8 sayfa)
├── src-tauri/                    # Rust backend
│   ├── src/                      # Rust kaynak kodu
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri konfigurasyonu
│   └── capabilities/             # Tauri izinleri
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts                # Vite konfig (alias @→src)
├── tsconfig.json                 # TypeScript strict config
└── vitest.config.ts              # Test konfig
```

---

## 4. Kod Standartlari

### TypeScript
- **strict: true** — null checks, no implicit any
- **noUnusedLocals/noUnusedParameters: true**
- Path alias: `@/` → `./src/`
- Target: ES2020, module: ESNext

### React
- Functional components only
- `memo()` ile optimizasyon (canvas dugumlerinde kullanilir)
- `useCallback` / `useMemo` gerektiginde
- Hooks: custom hooks `src/hooks/` altinda

### Stil
- Tailwind CSS v4 (yeni syntax, CSS-first config)
- CSS custom properties: `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)`, vb.
- `cn()` fonksiyonu ile conditional class birlestirme (clsx + twMerge)
- Dark/light tema: `data-theme` attribute + `dark` class on `<html>`

### State Yonetimi (Zustand)
- Store'lar `src/store/` altinda
- `persist` middleware ile kalici veri (IndexedDB)
- `subscribeWithSelector` ile selective subscription
- `idbStorage` custom adapter (5MB localStorage limitini asar)
- Undo/Redo: `pushHistory()` → `undo()` / `redo()` (delta-based, MAX_HISTORY=30)

### Component Pattern
```typescript
// Store kullanimi
const { nodes, setNodes } = useReactFlow();
const { codes } = useProjectStore();
const theme = useAppStore((s) => s.theme);

// i18n
const t = useT();
// veya direkt:
t("canvas.untitled", language);

// CSS
className={cn("base-classes", condition && "conditional-class")}
```

---

## 5. Tauri Konfigurasyonu

```json
{
  "productName": "QualityOpen",
  "version": "1.3.7",
  "identifier": "com.ivg.qualityopen",
  "app": {
    "windows": [{
      "width": 1280,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "decorations": false,
      "transparent": false
    }]
  },
  "bundle": {
    "targets": ["nsis", "dmg", "app"],
    "createUpdaterArtifacts": false
  }
```

- Custom title bar (decorations: false)
- Window boyutu: 900x600 minimum, 1280x800 default
- Updater: GitHub API uzerinden versiyon kontrolu (Tauri plugin-updater yerine)

---

## 6. Lisans Modeli

- **Open Source:** AGPL-3.0 altinda tamamen ucretsiz
- Tum ozellikler sinirsiz: dokuman, mindmap dugumu, dosya boyutu
- AI ozellikler, export ozellikleri, sync — hepsi ucretsiz
- Herhangi bir lisans aktivasyonu gerektirmez

---

## 7. Veri Akisi

```
Kullanici etkilesimi
    ↓
React Component
    ↓
Zustand Store (app.store / project.store)
    ↓
persist middleware → idbStorage → IndexedDB (offline-first)
    ↓ (debounced 1.5s)
writeSnapshotToDb → IndexedDB mirror
    ↓ (eger authenticated)
Google Drive sync (Firebase auth token)
    ↓ (eger localFolderPath ayarli)
Lokal klasor sync
```

---

## 8. Navigasyon Yapisi

```
LeftPanel (sol kenar cubugu)
├── Documents
├── Coding
├── Analysis
├── Memos
├── [footer]
│   ├── Visualizer (conceptMap)  ← MINDMAP
│   ├── Reflexivity Journal
│   ├── Analysis
│   └── Settings
```

`activeView: ViewMode` state'i ile `CenterPanel` icinde routing yapilir.

ViewMode tipleri: `"documents" | "coding" | "analysis" | "memos" | "settings" | "dashboard" | "reflexivity" | "conceptMap"`

---

## 9. Build & Development Komutlari

```bash
pnpm dev          # Vite dev server (localhost:1420)
pnpm build        # TypeScript check + Vite build
pnpm tauri dev    # Tauri + Vite birlikte dev mode
pnpm tauri build  # Production build (.dmg / .nsis / .app)
pnpm test         # Vitest run
pnpm test:watch   # Vitest watch mode
```

---

## 10. Onemli Notlar

1. **CSP (Content Security Policy):** Tauri konfiginde strict CSP var. Harici script/style yuklenemez.
2. **oklch/oklab renk sorunu:** Tailwind v4 bu renk formatlarini kullanir, `html2canvas` desteklemez. Export icin regex ile replace edilir.
3. **Tauri Drag & Drop:** Tauri'nin global D&D listener'lari conceptMap view'inde devre disi birakilir (satir 244, App.tsx).
4. **Undo/Redo:** `pushHistory()` mutation'on ONCESI cagrilmalidir. Microtask ile delta yakalanir.
5. **i18n:** 8 dil destegi. Yeni key eklenirse tum locale dosyalarina eklenmeli (en.ts, tr.ts, de.ts, es.ts, nl.ts, fr.ts, it.ts, pt.ts).
6. **Path alias:** `@/` her yerde kullanilir, klasik relative import yoktur.
