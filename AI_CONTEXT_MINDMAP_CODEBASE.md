# AI Context: Mindmap/Visualizer Kod Tabani Referansi

> Bu dosya, bir AI asistaninin mindmap ozelligini sifirdan anlamasi ve gelistirmesi icin
> tum ilgili kaynak kodun ve mekanizmalarin referansini icerir.

---

## 1. ILGILI DOSYALAR LISTESI

Bir AI asistaniin okumasi gereken dosyalar (oncelik sirasina gore):

### Zorunlu (Core)
1. `src/components/ConceptMapBoard.tsx` — Ana canvas wrapper (568 satir)
2. `src/components/canvas/AssetsPanel.tsx` — Sag panel, kod/alinti listesi (211 satir)
3. `src/components/canvas/MemoNode.tsx` — Memo dugumu (147 satir)
4. `src/components/canvas/CodeNode.tsx` — Kod dugumu (152 satir)
5. `src/components/canvas/QuoteNode.tsx` — Alinti dugumu (141 satir)
6. `src/components/canvas/LabeledEdge.tsx` — Etiketli kenar (119 satir)
7. `src/store/project.store.ts` — Zustand store, conceptMaps actions (satir 609-654)
8. `src/types/index.ts` — ConceptMap interface (satir 146-154)

### Baglam (Context)
9. `src/store/app.store.ts` — activeView, theme, activeProjectId state
10. `src/store/license.store.ts` — isPro, openModal (limit kontrolleri icin)
11. `src/store/toast.store.ts` — Bildirim sistemi
12. `src/components/panels/CenterPanel.tsx` — View routing (satir 465)
13. `src/components/panels/LeftPanel.tsx` — Nav butonu (satir 612-614)
14. `src/lib/constants.ts` — CODE_COLORS paleti
15. `src/lib/i18n.ts` — i18n mekanizmasi
16. `src/lib/utils.ts` — cn(), yardimci fonksiyonlar
17. `src/App.tsx` — Global D&D konfigurasyonu, Tauri entegrasyonu

### Uluslararasilastirma
18. `src/locales/en.ts` — canvas.* key'leri (satir 192-210)
19. `src/locales/tr.ts` — Turkce ceviriler

---

## 2. COMPLETE TYPE DEFINITIONS

```typescript
// src/types/index.ts

export type ID = string;

export interface ConceptMap {
  id: ID;
  projectId: ID;
  name: string;
  nodes: any[];       // ← TIP GUVENLIGI YOK, guclendirilmeli
  edges: any[];       // ← TIP GUVENLIGI YOK, guclendirilmeli
  createdAt: number;
  updatedAt: number;
}

export type ViewMode = 
  | "documents" | "coding" | "analysis" | "memos" 
  | "settings" | "dashboard" | "reflexivity" | "conceptMap";

// Dugum data tipleri (codebase'den cikarildi):

// MemoNode data
interface MemoNodeData {
  label: string;
  content: string;
  colorIndex: number;  // 0-4 arasi, MEMO_COLORS index
  memoId?: string;     // Opsiyonel, project store'daki memo'ya referans
}

// CodeNode data
interface CodeNodeData {
  label: string;       // Kod adi
  color?: string;      // Hex renk kodu
  usageCount?: number; // Kullanim sayisi
  codeId?: string;     // Opsiyonel, project store'daki kod referansi
}

// QuoteNode data
interface QuoteNodeData {
  label: string;       // Alinti metni
  text: string;        // Alinti metni (label ile ayni olabilir)
  documentId?: string; // Kaynak belge ID'si
  docName?: string;    // Belge adi (goruntu icin)
}

// LabeledEdge data
interface LabeledEdgeData {
  label?: string;         // Kenar etiketi
  color?: string;         // Hex renk
  dash?: string;          // SVG strokeDasharray ("", "4 4", "1 2")
  strokeWidth?: number;   // Kenar kalinligi (1, 2, 4)
}
```

---

## 3. STORE API — Concept Maps

```typescript
// src/store/project.store.ts — ConceptMap ile ilgili state ve actions

interface ProjectStore {
  conceptMaps: ConceptMap[];
  
  // Yeni harita olusturur (projede harita yoksa auto-create icin)
  addConceptMap: (projectId: ID, name: string) => ConceptMap;
  
  // Dugumleri gunceller (debounced, ConceptMapInner'dan 100ms ile cagrilir)
  updateConceptMapNodes: (id: ID, nodes: any[]) => void;
  
  // Kenarlari gunceller (debounced, ConceptMapInner'dan 100ms ile cagrilir)
  updateMapEdges: (id: ID, edges: any[]) => void;
  
  // Harita adini degistirir
  renameConceptMap: (id: ID, name: string) => void;
  
  // Haritayi sifirlar (nodes=[], edges=[])
  resetConceptMap: (id: ID) => void;
  
  // Haritayi siler
  deleteConceptMap: (id: ID) => void;
}

// Persistence: Zustand persist middleware → idbStorage → IndexedDB
// Store key: "qo-project-data"
// partialize alanlari: conceptMaps dahil (satir 670)
```

---

## 4. BILESEN HIERARSI VE RENDER AKISI

```
App.tsx
  └─ <PanelLayout>
       ├─ <LeftPanel>          → "Visualizer" nav butonu (satir 612)
       │    → setActiveView("conceptMap")
       │
       ├─ <CenterPanel>        → View routing (satir 465)
       │    └─ if (activeView === "conceptMap")
       │         → <ConceptMapBoard />
       │              └─ <ReactFlowProvider>
       │                   └─ <ConceptMapInner>
       │                        ├─ Toolbar (ad, reset, export, +New Idea)
       │                        ├─ <ReactFlow>
       │                        │    ├─ <Background> (lines, 30px gap)
       │                        │    ├─ <Controls>
       │                        │    ├─ <MiniMap>
       │                        │    └─ node types: memo, code, quote
       │                        │    └─ edge types: labeled
       │                        └─ <AssetsPanel /> (sag panel, 264px)
       │
       └─ <RightPanel>         → (conceptMap view'inde kullanilmaz)
```

---

## 5. DETAYLI MEKANIZMALAR

### 5.1 State Senkronizasyonu (ConceptMapInner)

```
┌─────────────────────────────────────────────────────┐
│  Zustand Store (conceptMaps[])                      │
│       ↕ (find by projectId)                        │
│  currentMap = conceptMaps.find(m => m.projectId)   │
│       ↕                                            │
│  Local React State                                 │
│  ├─ nodes ← useNodesState(currentMap?.nodes || []) │
│  └─ edges ← useEdgesState(currentMap?.edges || []) │
└─────────────────────────────────────────────────────┘
```

**Senkronizasyon Kurallari:**
1. **Store → Local:** Sadece harita ID'si degistiginde (proje switch). `lastSyncedMapId` ref ile infinite loop onlenir.
2. **Local → Store:** 100ms debounce ile. `nodes` degisince `updateConceptMapNodes`, `edges` degisince `updateMapEdges` cagrilir.
3. **Auto-create:** Proje icin harita yoksa `addConceptMap` ile otomatik olusturulur.

### 5.2 Drag & Drop Mekanizmasi (Katmanli)

**Katman 1 — React Event Handlers:**
```typescript
// ConceptMapInner'da:
<div onDragEnter={onDragEnter} onDragOver={onDragOver} onDrop={onDrop}>
  <ReactFlow ... />
</div>
```

**Katman 2 — Global Window Listeners (Tauri/WebKit uyumluluk):**
```typescript
// useEffect ile window'a eklenir:
window.addEventListener("drop", handleGlobalDrop, true);  // capture phase
window.addEventListener("manual-drop", handleManualDrop);
window.addEventListener("dragover", (e) => e.preventDefault());
```

**Drop Payload Format:**
```typescript
// AssetsPanel'den gonderilen veri:
const payload = JSON.stringify({ 
  nodeType: "code" | "quote" | "memo", 
  data: { label, color, usageCount, docName, ... } 
});
dt.setData("text", payload);
dt.setData("text/plain", payload);
dt.setData("application/reactflow", payload);
```

**Drop Isleme:**
1. `event.dataTransfer.getData()` ile payload alinir (senkron, WebKit zorunlulugu)
2. `screenToFlowPosition()` ile mouse koordinatlari flow koordinatlarina cevrilir
3. Yeni node olusturulur: `{ id: uuid(), type: nodeType, position, data }`
4. `setNodes()` ile local state'e eklenir
5. 100ms debounce ile store'a persist edilir

**Manual Drop (AssetsPanel'den "+" butonu):**
```typescript
// AssetsPanel.onAdd():
const customEvent = new CustomEvent("manual-drop", {
  detail: {
    appData: JSON.stringify({ nodeType, data }),
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2
  }
});
window.dispatchEvent(customEvent);
```

### 5.3 Lisans Limit Kontrolu

Free kullanicilar icin 5 dugum limiti. **4 farkli yerde** kontrol edilir:
1. `ConceptMapInner.onDrop` (satir 141)
2. `ConceptMapInner.addNewNode` (satir 289)
3. `ConceptMapInner.handleManualDrop` (global listener, satir 248)
4. `AssetsPanel.onDragStart` (satir 47)
5. `AssetsPanel.onAdd` (satir 65)

### 5.4 Export Mekanizmasi

```
Kullanici → Export PNG/PDF butonu
    ↓
html2canvas(.react-flow__viewport, { scale: 2 })
    ↓ onclone:
    ├─ <style> tag'lernde oklch/oklab → #a1a1aa replace
    ├─ Inline style'larda ayni replace
    └─ External stylesheets'de ayni replace
    ↓
Background + Controls visibility gizle
    ↓
Tauri save dialog → dosya yolu sec
    ↓
PNG: canvas.toDataURL() → base64 → Uint8Array → writeFile
PDF: jsPDF → addImage → arrayBuffer → writeFile
    ↓
Toast bildirim
```

### 5.5 Harita Adi Duzenleme

```
Double-click on title → isEditingTitle=true, tempTitle=currentMap.name
    ↓
<input> render (autoFocus)
    ↓
Enter → handleTitleBlur() → renameConceptMap(id, tempTitle.trim())
Escape → setIsEditingTitle(false)
Blur   → handleTitleBlur()
```

---

## 6. DUGUM DETAYLARI

### 6.1 MemoNode

```
Gorunum: Sticky-note (renkli border + bg)
Boyut: min 200x140px, NodeResizer ile boyutlandirilabilir
Renk: 5 scheme (yellow, blue, green, red, purple)
    - Tailwind dark class'larina bagimli (bg-yellow-50 dark:bg-yellow-900/20)
Duzenleme: Inline title (input) + content (textarea)
Handle'lar: 8 adet (4 yon × target+source), amber renk, hover'da gorunur
Silme: YOK — dugum uzerinde delete butonu yok!
```

### 6.2 CodeNode

```
Gorunum: Pill/rounded-full (kod rengi border + hafif bg)
Boyut: min 140x40px, NodeResizer ile boyutlandirilabilir
Renk: CODE_COLORS paletinden (12 renk), Palette butonu ile secilir
Icerik: Hash ikonu + label + usageCount (read-only)
Handle'lar: 8 adet, mavi renk, hover'da gorunur
Silme: Hover'da X butonu
```

### 6.3 QuoteNode

```
Gorunum: Kart (border + shadow, rounded-xl)
Boyut: min 220x120px, NodeResizer ile boyutlandirilabilir
Icerik: Quote ikonu + alinti metni (italic, line-clamp-6)
Footer: Belge adi + jump butonu (setActiveDocument)
Handle'lar: 8 adet, gri renk, hover'da gorunur
Silme: Hover'da X butonu
```

### 6.4 LabeledEdge

```
Tip: Bezier egri (getBezierPath)
Etiket: Opsiyonel, kenarin ortasinda (EdgeLabelRenderer)
Renk: 6 secenek (slate, red, blue, green, amber, purple)
Stil: Solid / Dashed / Dotted
Kalinlik: 1x / 2x / 4x
Tum kontroller: Kenar secildiginde gorunur (floating panel)
```

---

## 7. ASSETS PANEL DETAYLARI

```
Konum: Canvas'in saginda, 264px genisliginde, daraltilabilir
Sekmeler: Codes | Quotes
Arama: Her iki sekmede arama destegi (codes: name, quotes: text)
Etkilesim:
  ├─ Drag: Ogeyi surukle → canvas'a birak (drag data: { nodeType, data })
  └─ Click: "+" butonu → manual-drop custom event → canvas'a ekle
Lisans: 5 dugum limiti hem drag start'ta hem click'te kontrol edilir
```

---

## 8. I18N KEY'LERI (canvas.*)

```typescript
// Tum locale dosyalarina eklenmeli:
"canvas.untitled":      "Untitled Map"
"canvas.newIdea":       "New Idea"
"canvas.edgeLabel":     "Relationship Label"
"canvas.exportPng":     "Export as PNG"
"canvas.exportPdf":     "Export as PDF"
"canvas.export":        "Export Map"
"canvas.assets":        "Assets"
"canvas.codes":         "Codes"
"canvas.quotes":        "Quotes"
"canvas.deleteNode":    "Delete Node"
"canvas.editLabel":     "Edit Label"
"canvas.dropToCreate":  "Drop to create node"
"canvas.sourceLabel":   "Source"
"canvas.search":        "Search..."
"canvas.unknownDoc":    "Unknown Document"
"canvas.memo":          "Memo"
"canvas.confirmReset":  "Are you sure you want to reset the map?..."
"canvas.addToMap":      "Add to Map"
"canvas.reset":         "Reset Map"
"nav.conceptMap":       "Visualizer" (TR: "Görselleştirici")
```

---

## 9. BILINEN SORUNLAR VE DUSUNCELER

1. **Tip guvenligi:** `nodes: any[]`, `edges: any[]` — React Flow'un Node/Edge generic tipleri kullanilmali.
2. **Tek harita limiti:** `conceptMaps.find(m => m.projectId === activeProjectId)` — sadece ilk eslesen harita kullanilir.
3. **Undo/Redo:** Store'da generic undo/redo var ama canvas degisiklikleri `pushHistory()` cagirmaz.
4. **Kenar etiketi UI:** `onConnect`'te bos string atanir, kullanicinin etiket girme yolu yok.
5. **D&D karmasikligi:** Cift katmanli (React + global window) Tauri uyumluluk icin. Basitlestirilebilir.
6. **MemoNode silinemez:** CodeNode ve QuoteNode'un X butonu var ama MemoNode'un yok.
7. **Tailwind dark class'lari:** MemoNode `bg-yellow-50 dark:bg-yellow-900/20` kullaniyor — CSS custom properties ile tutarsiz. Diger dugumler `var(--bg-secondary)` kullaniyor.
8. **Layout yok:** Manuel pozisyonlama disinda otomatik duzen yok. d3-force devDependency'de ama kullanilmadi.
9. **Klavye desteği:** Canvas'ta Delete/Backspace ile dugum silme, Ctrl+D ile kopyalama vs. yok.
10. **Arama yok:** Harita icinde dugum/kenar iceriginde arama yapilamiyor.
