# Mindmap / Visualizer Ozelligi - Mevcut Durum Analizi

## 1. Genel Bakis

QualityOpenQDA (QualityOpen) projesinde mindmap ozelligi **"Visualizer"** (TR: "Gorsellestirici") adiyla entegre edilmistir. Sol paneldeki alt navigasyon menusunden erisilir ve merkezi panelde (`CenterPanel`) `"conceptMap"` view modu olarak render edilir.

**Kullanilan ana kutuphane:** `@xyflow/react` (React Flow v12) — dugum-tabanli grafik gorsellestirme icin.

---

## 2. Dosya Yapisi

```
src/
├── components/
│   ├── ConceptMapBoard.tsx          # Ana canvas bileşeni (wrapper + inner)
│   └── canvas/
│       ├── AssetsPanel.tsx          # Sag panel - kodlar ve alintilar listesi
│       ├── CodeNode.tsx             # Kod dugumu (pill/rounded shape)
│       ├── MemoNode.tsx             # Memo/sticky-note dugumu
│       ├── QuoteNode.tsx            # Alinti dugumu (document reference)
│       └── LabeledEdge.tsx          # Etiketli baglanti kenari
├── store/
│   └── project.store.ts            # Zustand store - conceptMaps state yonetimi
├── types/
│   └── index.ts                    # ConceptMap interface tanimi
├── lib/
│   └── constants.ts                # CODE_COLORS paleti
├── locales/
│   └── en.ts                       # "canvas.*" i18n anahtarlari
└── components/panels/
    ├── CenterPanel.tsx              # conceptMap view routing
    └── LeftPanel.tsx                # "Visualizer" nav butonu
```

---

## 3. Veri Modeli

### 3.1 ConceptMap Interface (`src/types/index.ts:146`)

```typescript
export interface ConceptMap {
  id: ID;
  projectId: ID;
  name: string;
  nodes: any[];      // ReactFlow Node objects
  edges: any[];      // ReactFlow Edge objects
  createdAt: number;
  updatedAt: number;
}
```

- **Her proje icin tek bir harita** olusturulur (`projectId` bazli `find` ile bulunur).
- `nodes` ve `edges` dizileri `any[]` olarak tanimlanmistir — tip guvenligi zayif.
- Harita verileri Zustand + IndexedDB (`idbStorage`) uzerinde kalici olarak saklanir.

### 3.2 Dugum Tipleri (Node Types)

| Tip       | Bilesen              | Aciklama                                      |
|-----------|----------------------|-----------------------------------------------|
| `memo`    | `MemoNodeComponent`  | Serbest not dugumu (baslik + icerik textarea) |
| `code`    | `CodeNodeComponent`  | Proje kodlarindan olusturulan pill-seklinde dugum |
| `quote`   | `QuoteNodeComponent` | Belge alintisi dugumu (document jump ozelligli) |

### 3.3 Kenar Tipi (Edge Type)

| Tip       | Bilesen                | Aciklama                                                |
|-----------|------------------------|---------------------------------------------------------|
| `labeled` | `LabeledEdgeComponent` | Bezier egri, etiketli, ozellestirilebilir (renk, kalinlik, cizgi stili) |

---

## 4. Bilesen Detaylari

### 4.1 ConceptMapBoard (`src/components/ConceptMapBoard.tsx`)

Ana wrapper bilesen. Iki katmanli yapidadir:

1. **`ConceptMapBoard`** (export): `ReactFlowProvider` ile sarmalar.
2. **`ConceptMapInner`** (ic bilesen): Tum mantik burada.

**Temel Mekanizmalar:**

- **State Sync:** Project store'daki `conceptMaps` dizisinden aktif projenin haritasi bulunur. Harita ID'si degistiginde (proje switch) local state guncellenir (`lastSyncedMapId` ref ile infinite loop onlenir).
- **Debounced Persist:** Local `nodes` ve `edges` state'leri 100ms debounce ile store'a yazilir (`updateConceptMapNodes`, `updateMapEdges`).
- **Auto-create:** Proje icin harita yoksa otomatik olusturulur (`addConceptMap`).

**Drag & Drop Mekanizmasi:**

- AssetsPanel'den suruklenen kodlar ve alintilar canvas'a birakilir.
- `application/reactflow`, `text`, `text/plain` dataTransfer formatlari kullanilir.
- **Cift katmanli D&D:** Hem React `onDrop` handler'i hem de global `window.addEventListener("drop", ...)` capture-phase listener ile calisir. Bu, WebKit/Tauri uyumluluk sorunlarini cozmek icin eklenmistir.
- `manual-drop` custom event ile ikinci katman tetiklenir.

**Lisans Sinirlamasi:**
- Free kullanicilar en fazla **5 dugum** olusturabilir (`isPro` kontrolu).
- Dugum ekleme, drop ve manuel ekleme islemlerinde lisans kontrolu yapilir.

**Toolbar Ozellikleri:**
- Harita adini duzenleme (double-click ile inline edit)
- Reset (onay dialogu ile)
- PNG / PDF export (`html2canvas` + `jsPDF`)
- Yeni "Idea" dugumu ekleme butonu

**Export Mekanizmasi:**
- `html2canvas` ile viewport screenshot alinir.
- oklch/oklab/color-mix renk fonksiyonlari Tailwind 4 uyumsuzlugu icin regex ile replace edilir (`COLOR_FIX_REGEX`).
- Tauri `save` dialogu ile dosya yolu secilir, `writeFile` ile yazilir.

---

### 4.2 AssetsPanel (`src/components/canvas/AssetsPanel.tsx`)

Sag taraftaki 264px genisligindeki, daraltilabilir panel.

**Sekmeler:**
- **Codes:** Proje kodlarini listeler. Arama filtreleme destegi.
- **Quotes:** Kodlanmis segmentleri (alintilari) listeler. Belge adina gore siralanir.

**Etkilesim:**
- Her oge suruklenebilir (`draggable` + `onDragStart`).
- Her ogenin yaninda "+" butonu ile dogrudan haritaya eklenebilir (`manual-drop` custom event dispatch).
- Lisans limiti (5 dugum) drag start sirasinda da kontrol edilir.

---

### 4.3 MemoNode (`src/components/canvas/MemoNode.tsx`)

Sticky-note benzeri serbest not dugumu.

- **5 renk semasi:** Yellow, Blue, Green, Red, Purple (Tailwind class bazli).
- **Inline duzenleme:** Baslik (`input`) ve icerik (`textarea`) dogrudan dugum uzerinde duzenlenebilir.
- **Color picker:** Dugum secildiginde alt kisminda renk secici appear eder.
- **Boyut degistirme:** `NodeResizer` ile min 150x120px.
- **Handle'lar:** 4 yonlu (top/bottom/left/right), target+source cifti, Loose connection mode.

---

### 4.4 CodeNode (`src/components/canvas/CodeNode.tsx`)

Proje kodlarini temsil eden pill/rounded-full seklinde dugum.

- **Veri:** `label` (kod adi), `color` (kod rengi), `usageCount` (kullanim sayisi).
- **Renk paleti:** `CODE_COLORS` sabitinden 12 renkli palette ile degistirilebilir.
- **Silme:** Hover'da X butonu ile silinebilir.
- **Handle'lar:** 4 yonlu, dugum tipiyle uyumlu.
- **Boyut:** min 140x40px.

---

### 4.5 QuoteNode (`src/components/canvas/QuoteNode.tsx`)

Belge alintisi dugumu.

- **Veri:** `text`/`label` (alinti metni), `documentId` (kaynak belge).
- **Document Jump:** Kaynak belgeye git butonu (footer'da belge adi tiklanabilir).
- **Silme:** Hover'da X butonu ile.
- **Boyut:** min 220x120px.
- **Handle'lar:** 4 yonlu, gri renk temasinda.

---

### 4.6 LabeledEdge (`src/components/canvas/LabeledEdge.tsx`)

Baglanti kenari bileseni.

- **Bezier egri** (`getBezierPath`).
- **Etiket:** Opsiyonel metin etiketi, kenarin ortasinda render edilir.
- **Ozellestirme (secildiginde):**
  - 6 renk secenegi (slate, red, blue, green, amber, purple)
  - 3 cizgi stili: Solid, Dashed (4 4), Dotted (1 2)
  - 3 kalinlik: 1x, 2x, 4x
  - Silme butonu
- `EdgeLabelRenderer` kullanilarak etiket ve kontrol paneli render edilir.

---

## 5. State Yonetimi

### 5.1 Zustand Store (`src/store/project.store.ts`)

```
conceptMaps: ConceptMap[]   // Tum haritalar (proje bazli filtrelenir)
```

**Store Actions:**

| Action                  | Aciklama                                    |
|-------------------------|---------------------------------------------|
| `addConceptMap`         | Yeni harita olusturur (auto-create icin)    |
| `updateConceptMapNodes` | Dugumleri gunceller (debounced)             |
| `updateMapEdges`        | Kenarlari gunceller (debounced)             |
| `renameConceptMap`      | Harita adini degistirir                     |
| `resetConceptMap`       | Tum dugum ve kenarlari temizler             |
| `deleteConceptMap`      | Haritayi siler                              |

### 5.2 Persistence

- **IndexedDB** (`idbStorage`) uzerinde `qo-project-data` key'i ile saklanir.
- `partialize` ile sadece gerekti alanlar (nodes, edges, name, timestamps) kalici edilir.
- Backup/restore payload'una `conceptMaps` dahildir.

---

## 6. Entegrasyon Noktalari

### 6.1 Routing

```
LeftPanel.tsx:612  →  "conceptMap" nav butonu (footer'da, Palette ikonu ile)
CenterPanel.tsx:465 →  if (activeView === "conceptMap") return <ConceptMapBoard />
```

### 6.2 ViewMode

```typescript
// src/types/index.ts:166
export type ViewMode = ... | "conceptMap";
```

### 6.3 App.tsx

- `"conceptMap"` aktifken dosya surukleme overlay'i gosterilmez (satir 244).

### 6.4 i18n

- 19 adet `canvas.*` lokalizasyon anahtari (en, tr, de, es, nl, fr, it, pt dillerinde).

---

## 7. Teknik Notlar ve Sorunlar

### 7.1 Tip Guvenligi
- `ConceptMap.nodes: any[]` ve `ConceptMap.edges: any[]` — guclendirilmeli.

### 7.2 Drag & Drop
- Cift katmanli D&D mekanizmasi (React + global window listener) **Tauri/WebKit** uyumlulugu icin eklenmis. Bu karmaşık bir cozumdur ve basitlestirilebilir.

### 7.3 Lisans
- Free tier 5 dugum limiti. Kontrol birden fazla yerde tekrar eder (ConceptMapInner, AssetsPanel, global listener). Merkezi bir hook'e cekilebilir.

### 7.4 Export
- `html2canvas` oklch renk problemi icin regex-based workaround var. Bu downstream kutuphane hatasidir ve guncelleme ile cozulebilir.

### 7.5 Tek Harita Limiti
- Her proje icin sadece **bir** harita olusturulur (`find` ile ilk eslesen). Coklu harita destegi yoktur.

### 7.6 Dugum Icerik Duzenleme
- `MemoNode` duzenlenebilir (title + content), ancak `CodeNode` ve `QuoteNode` duzenlenemez (read-only label).

### 7.7 Kenbaglanti Etiketi
- Kenar etiketi yalnizca programmatically eklenir (`onConnect` ile bos string). Kullanicinin etiket girme UI'i yoktur.

---

## 8. Akis Diyagramu

```
[Kullanici] → Sol Panel "Visualizer" tikla
                    ↓
         activeView = "conceptMap"
                    ↓
         CenterPanel → <ConceptMapBoard />
                    ↓
     ReactFlowProvider → ConceptMapInner
                    ↓
     ┌──────────────────────────────────┐
     │  Toolbar: Ad | Reset | Export    │
     │  Canvas: ReactFlow               │
     │    ├─ nodes (memo/code/quote)    │
     │    ├─ edges (labeled)            │
     │    └─ Controls + MiniMap         │
     │  AssetsPanel (sag taraf)         │
     │    ├─ Codes tabesi               │
     │    └─ Quotes tabesi              │
     └──────────────────────────────────┘
                    ↓
     nodes/edges degisikleri → 100ms debounce
                    ↓
     Zustand store → IndexedDB (kalici)
```

---

## 9. Kullanilan Kutuphaneler

| Kutuphane             | Surum   | Kullanim Amaci                    |
|-----------------------|---------|-----------------------------------|
| `@xyflow/react`       | ^12.10  | Canvas grafik motoru              |
| `html2canvas`         | ^1.4.1  | Export icin screenshot            |
| `jspdf`               | ^4.2    | PDF export                        |
| `lucide-react`        | ^0.575  | Ikonlar                           |
| `zustand`             | ^5.0    | State yonetimi                    |
| `idb`                 | ^8.0    | IndexedDB storage                 |
| `@tauri-apps/plugin-dialog` | ^2.6 | Native dosya dialogu       |
| `@tauri-apps/plugin-fs`     | ^2.4 | Dosya yazma                |
