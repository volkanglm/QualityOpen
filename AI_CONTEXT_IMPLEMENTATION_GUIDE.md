# AI Context: Mindmap Gelistirme Implementasyon Rehberi

> Bu dosya, bir AI asistaninin FUTUREMINDMAP.md'deki onerileri adim adim
> implement etmesi icin hazirlanmistir. Her gorev icin: degisecek dosyalar,
> yeni olusturulacak dosyalar, implementasyon detaylari ve potansiyel tuzaklar.

---

## GOREV 0: Tip Guvenligi (P0, Dusuk Effort)

### Degisecek Dosyalar
- `src/types/index.ts`

### Yapilacaklar

```typescript
// types/index.ts'e ekle:

import type { Node, Edge } from "@xyflow/react";

// ─── Mindmap Node Data Types ───

export interface MemoNodeData extends Record<string, unknown> {
  label: string;
  content: string;
  colorIndex: number;
  memoId?: string;
}

export interface CodeNodeData extends Record<string, unknown> {
  label: string;
  color?: string;
  usageCount?: number;
  codeId?: string;
}

export interface QuoteNodeData extends Record<string, unknown> {
  label: string;
  text: string;
  documentId?: string;
  docName?: string;
}

export interface LabeledEdgeData extends Record<string, unknown> {
  label?: string;
  color?: string;
  dash?: string;
  strokeWidth?: number;
}

// Union types
export type ConceptMapNodeData = MemoNodeData | CodeNodeData | QuoteNodeData;
export type ConceptMapNode = Node<ConceptMapNodeData>;
export type ConceptMapEdge = Edge<LabeledEdgeData>;

// ConceptMap interface'i guncelle:
export interface ConceptMap {
  id: ID;
  projectId: ID;
  name: string;
  nodes: ConceptMapNode[];   // any[] → strict
  edges: ConceptMapEdge[];   // any[] → strict
  createdAt: number;
  updatedAt: number;
}
```

### Store Guncelleme
- `src/store/project.store.ts`: `updateConceptMapNodes` ve `updateMapEdges` parametre tiplerini `ConceptMapNode[]` ve `ConceptMapEdge[]` yap.

### Dikkat
- React Flow'un `Node<T>` tipi ile uyumlu olmali. `Record<string, unknown>` extend edilmesi zorunlu (React Flow constraint).
- Mevcut veri IndexedDB'de `any[]` olarak kayitli — migration gerekmez cunku runtime'da tip check yapilmaz, ama yeni yazilan veri strict tipte olacak.

---

## GOREV 1: Undo/Redo Canvas (P0, Orta Effort)

### Mevcut Altyapi
- `project.store.ts`'da generic undo/redo var: `pushHistory()`, `undo()`, `redo()`, `StateDelta`.
- Canvas degisiklikleri bunu kullanmiyor cunku 100ms debounce ile yaziliyor.

### Strateji
Canvas icin ayri bir undo/redo stack kullan (React Flow'un `onNodesChange`/`onEdgesChange` eventlerini yakala).

### Yeni Dosya
- `src/hooks/useCanvasHistory.ts`

### Yapilacaklar

```typescript
// useCanvasHistory.ts
import { useCallback, useRef } from "react";
import { Node, Edge, OnNodesChange, OnEdgesChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

export function useCanvasHistory(
  initialNodes: Node[],
  initialEdges: Edge[]
) {
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);

  const pushState = useCallback((nodes: Node[], edges: Edge[]) => {
    past.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    if (past.current.length > 50) past.current.shift();
    future.current = [];
  }, []);

  const undo = useCallback((): HistoryEntry | null => {
    if (past.current.length === 0) return null;
    const prev = past.current.pop()!;
    return prev;
  }, []);

  const redo = useCallback((): HistoryEntry | null => {
    if (future.current.length === 0) return null;
    const next = future.current.pop()!;
    return next;
  }, []);

  return { pushState, undo, redo, past, future };
}
```

### Entegrasyon (ConceptMapBoard.tsx)
- `onNodesChange` ve `onEdgesChange` eventlerinde `pushState()` cagir.
- `Ctrl+Z` / `Ctrl+Shift+Z` icin `useEffect` ile keydown listener ekle.
- Undo/redo sonrasi `setNodes()`/`setEdges()` ile state'i guncelle.

### Dikkat
- `structuredClone` gerekli (referans kopyalama yerine deep clone).
- Debounced persist ile undo stack arasinda conflict olmamali.

---

## GOREV 2: Klavye Kisayollari (P0, Dusuk Effort)

### Degisecek Dosyalar
- `src/components/ConceptMapBoard.tsx`

### Yapilacaklar

ConceptMapInner'a `useEffect` ile keydown listener ekle:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Delete/Backspace: Secili dugum/kenarlari sil
    if (e.key === "Delete" || e.key === "Backspace") {
      // input/textarea icindeyse ignore et
      if ((e.target as HTMLElement).tagName === "INPUT" || 
          (e.target as HTMLElement).tagName === "TEXTAREA") return;
      
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) => eds.filter((e) => !e.selected));
    }

    // Ctrl+D: Secili dugumu kopyala
    if ((e.metaKey || e.ctrlKey) && e.key === "d") {
      e.preventDefault();
      const selected = nodes.filter((n) => n.selected);
      const cloned = selected.map((n) => ({
        ...structuredClone(n),
        id: uuid(),
        position: { x: n.position.x + 30, y: n.position.y + 30 },
        selected: false,
      }));
      setNodes((nds) => [...nds.filter((n) => !n.selected), ...cloned]);
    }

    // Ctrl+A: Tumunu sec
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
    }

    // Ctrl+Z: Undo
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      // canvas undo cagir
    }

    // Ctrl+Shift+Z: Redo
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
      e.preventDefault();
      // canvas redo cagir
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [nodes, edges, setNodes, setEdges]);
```

### Dikkat
- `ShortcutEngine` bileseni zaten global shortcuts yonetiyor (`src/components/keyboard/ShortcutEngine.tsx`). Conflict olmamasi icin conceptMap view'inde override edilmeli veya ShortcutEngine'a canvas shortcuts eklenmeli.

---

## GOREV 3: Auto-Layout (P1, Orta Effort)

### Gerekli Kutuphane
- `d3-force` zaten `devDependencies`'te. Force-directed layout icin kullanilabilir.
- Hiyerarsik layout icin `dagre` eklenmeli: `pnpm add -D dagre @types/dagre`

### Yeni Dosya
- `src/lib/layout.utils.ts`

### Yapilacaklar

```typescript
// layout.utils.ts
import type { Node, Edge } from "@xyflow/react";
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from "d3-force";

export function forceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): Node[] {
  // 1. Node'ları d3-force formatina cevir
  const d3Nodes = nodes.map((n) => ({ 
    id: n.id, 
    x: n.position.x, 
    y: n.position.y,
    // width/height kullanilabilir (measured veya default)
  }));

  // 2. Edge'leri link formatina cevir
  const d3Links = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  // 3. Simulation calistir
  const simulation = forceSimulation(d3Nodes as any)
    .force("charge", forceManyBody().strength(-300))
    .force("link", forceLink(d3Links as any).id((d: any) => d.id).distance(150))
    .force("center", forceCenter(width / 2, height / 2))
    .force("collide", forceCollide(100))
    .stop();

  // 4. 300 tick calistir (animasyonsuz, anlik sonu c)
  simulation.tick(300);

  // 5. Pozisyonlari geri yaz
  return nodes.map((n) => {
    const d3Node = d3Nodes.find((d: any) => d.id === n.id);
    if (d3Node) {
      return {
        ...n,
        position: { x: (d3Node as any).x, y: (d3Node as any).y },
      };
    }
    return n;
  });
}
```

### Entegrasyon
- Toolbar'a "Auto Arrange" butonu ekle (Layout ikonu ile).
- Tiklandiginda `forceDirectedLayout(nodes, edges, canvasWidth, canvasHeight)` cagir ve `setNodes()` ile guncelle.

---

## GOREV 4: Kenar Etiket UI (P1, Dusuk Effort)

### Degisecek Dosyalar
- `src/components/canvas/LabeledEdge.tsx`

### Yapilacaklar

LabeledEdgeComponent'te etiket gosterimini duzenlenebilir yap:

```typescript
// Mevcut: sadece gosterim
{typeof data?.label === "string" && data.label && (
  <div className="...">{data.label}</div>
)}

// Yeni: cift tikla ile duzenleme
const [isEditing, setIsEditing] = useState(false);
const [editValue, setEditValue] = useState(data?.label || "");

// Render:
{isEditing ? (
  <input
    autoFocus
    value={editValue}
    onChange={(e) => setEditValue(e.target.value)}
    onBlur={() => {
      setEdges((eds) =>
        eds.map((e) => e.id === id ? { ...e, data: { ...e.data, label: editValue } } : e)
      );
      setIsEditing(false);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      if (e.key === "Escape") { setEditValue(data?.label || ""); setIsEditing(false); }
    }}
    className="..."
  />
) : (
  <div
    className="... cursor-pointer"
    onDoubleClick={() => { setEditValue(data?.label || ""); setIsEditing(true); }}
  >
    {data?.label || "+"}
  </div>
)}
```

---

## GOREV 5: Coklu Harita Destegi (P1, Orta Effort)

### Degisecek Dosyalar
- `src/components/ConceptMapBoard.tsx` — Harita secici UI
- `src/store/project.store.ts` — Aktif harita ID state
- `src/store/app.store.ts` — activeConceptMapId ekle (opsiyonel)

### Yapilacaklar

1. **Store'a ekle:**
```typescript
// app.store.ts:
activeConceptMapId: ID | null;
setActiveConceptMapId: (id: ID | null) => void;
```

2. **ConceptMapBoard toolbar'a harita secici ekle:**
```typescript
// Dropdown ile projenin haritalarini listele
const projectMaps = conceptMaps.filter(m => m.projectId === activeProjectId);
// + "Yeni Harita" butonu
// + Harita silme
```

3. **currentMap bulma mantigini guncelle:**
```typescript
// Eskisi: find (ilk eslesen)
// Yenisi: activeConceptMapId ile bul, yoksa ilkini sec
const currentMap = conceptMaps.find(m => m.id === activeConceptMapId) 
  || conceptMaps.find(m => m.projectId === activeProjectId);
```

---

## GOREV 6: Arama & Filtreleme (P1, Orta Effort)

### Yeni Dosya
- `src/components/canvas/MapSearch.tsx`

### Yapilacaklar

```typescript
// MapSearch.tsx
// Arama kutusu + filtre dropdown
// - Arama: nodes icinde label/content/text'de arama
// - Filtre: dugum tipine gore (memo/code/quote) goster/gizle
// - Highlight: eslesen dugumlerde ring/glow efekti
// - Navigate: sonraki/onceki eslesme dugumune zoom
```

### Entegrasyon
- Toolbar'a arama ikonu ekle (Search from lucide-react).
- Tikla → MapSearch overlay acilsin.
- React Flow'un `fitView({ nodes: [matchedNodes] })` ile zoom.

---

## GOREV 7: Group Node (P2, Orta Effort)

### Yeni Dosya
- `src/components/canvas/GroupNode.tsx`

### Yapilacaklar

React Flow'nun built-in `group` node tipini kullan:

```typescript
import { Node, NodeProps } from "@xyflow/react";

export const GroupNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  return (
    <div className="w-full h-full rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/20 relative">
      <div className="absolute top-2 left-3 text-[10px] font-bold uppercase text-[var(--text-tertiary)]">
        {data.label || "Group"}
      </div>
      {/* Child nodes otomatik render edilir (React Flow group behavior) */}
    </div>
  );
});
```

### Node Type Kaydi
```typescript
// ConceptMapBoard.tsx:
const nodeTypes = {
  memo: MemoNodeComponent,
  code: CodeNodeComponent,
  quote: QuoteNodeComponent,
  group: GroupNodeComponent,  // YENI
};
```

---

## GOREV 8: QDA-Ozel Otomatik Harita Olusturma (P2, Yuksek Effort)

### Degisecek Dosyalar
- `src/components/ConceptMapBoard.tsx` — Toolbar'a "Auto Generate" butonu
- Yeni: `src/lib/mindmapGenerators.ts`

### Yapilacaklar

```typescript
// mindmapGenerators.ts

// 1. Code Co-occurrence → Harita
export function generateCoOccurrenceMap(
  codes: Code[],
  segments: Segment[]
): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] } {
  // Her kod icin bir CodeNode olustur
  // Iki kod ayni segmentte varsa aralarina edge ekle
  // Edge kalinligi = co-occurrence sayisi
  // d3-force ile pozisyonla
}

// 2. Document-Code Network
export function generateDocCodeMap(
  documents: Document[],
  codes: Code[],
  segments: Segment[]
): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] } {
  // Document dugumleri + Code dugumleri
  // Document icinde kod kullanildiysa edge
}

// 3. Code Hierarchy → Harita
export function generateCodeTreeMap(
  codes: Code[]
): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] } {
  // Parent-child iliskilerinden hiyerarsik layout
  // dagre ile top-down duzen
}
```

---

## GOREV 9: MemoNode Silme Butonu (Quick Fix)

### Degisecek Dosyalar
- `src/components/canvas/MemoNode.tsx`

### Yapilacaklar

MemoNode'a CodeNode'daki gibi silme butonu ekle:

```typescript
// Header kismina (satir 50 civari) ekle:
<div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/10 dark:border-white/10">
  <StickyNote size={14} className="opacity-70" />
  <input ... />
  <button
    onClick={(e) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((n) => n.id !== id));
    }}
    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-all ml-auto"
  >
    <X className="h-3 w-3" />
  </button>
</div>
```

---

## GOREV 10: Gorsel Iyilestirmeler (P2-P3)

### Snap to Grid
```typescript
// ConceptMapBoard.tsx — ReactFlow'a snapToGrid ekle:
<ReactFlow
  snapToGrid={true}
  snapGrid={[15, 15]}
  ...
/>
```

### Connection Line Animasyon
```typescript
// LabeledEdge.tsx — Animated edge style:
style={{
  ...style,
  strokeWidth: (data?.strokeWidth as number) || 1,
  animation: data?.animated ? "dashdraw 0.5s linear infinite" : undefined,
  strokeDasharray: data?.animated ? "5 5" : (data?.dash as string),
}}
```

---

## IMPLEMENTASYON SIRASI ONERISI

```
1. Gorev 0: Tip Guvenligi (30 dk)
2. Gorev 9: MemoNode Silme (15 dk)
3. Gorev 2: Klavye Kisayollari (1 saat)
4. Gorev 4: Kenar Etiket UI (45 dk)
5. Gorev 1: Undo/Redo Canvas (2 saat)
6. Gorev 3: Auto-Layout (3 saat)
7. Gorev 5: Coklu Harita (3 saat)
8. Gorev 6: Arama & Filtreleme (3 saat)
9. Gorev 7: Group Node (2 saat)
10. Gorev 8: QDA Otomatik Harita (5 saat)
11. Gorev 10: Gorsel Iyilestirmeler (2 saat)
```

Toplam tahmini sure: ~22 saat

---

## TEST STRATEJISI

### Unit Tests
- `src/lib/layout.utils.ts` — Layout algoritmalarini isolated test et
- `src/lib/mindmapGenerators.ts` — Generator ciktilarini test et

### Integration Tests
- Store action'larini test et: addConceptMap, updateConceptMapNodes, undo/redo
- Drag & Drop payload formatini test et

### E2E Tests (Manual)
- Harita olusturma, dugum ekleme, kenar olusturma, export
- Klavye kisayollari
- Auto-layout
- Lisans limit kontrolleri

### Mevcut Test Altyapisi
- Vitest (`pnpm test`)
- Config: `vitest.config.ts`
- Test dosyalari: `src/lib/__tests__/` altinda

---

## ONEMLI: KOD YAZARKEN DIKKAT EDILECEKLER

1. **Yorum ekleme:** Projede yorum yok, yorum eklemeyin (kullanici tercihi).
2. **Path alias:** `@/` kullanin, relative import kullanmayin.
3. **CSS:** Tailwind utility class'lar + `var(--xxx)` CSS custom properties.
4. **Store:** Zustand pattern'ine sadik kalın. Yeni store gerekirse olusturun, mevcut store'a eklemeyi tercih edin.
5. **i18n:** Kullaniciya gorunen her metin `t("key")` ile olmali. Yeni key'ler tum 8 locale dosyasina eklenmeli.
6. **Lisans:** Yeni dugum tipleri veya ozellikler eklerken lisans limit kontrollerini unutmayin.
7. **React Flow:** `@xyflow/react` v12 API'sini kullanin (eski reactflow v11 degil).
8. **Tauri:** Harici dosya erisimi icin `@tauri-apps/plugin-fs` ve `@tauri-apps/plugin-dialog` kullanin.
9. **CSP:** Inline script/style calismaz. CSP Tauri konfiginde tanimli.
10. **TypeScript strict:** `noUnusedLocals` ve `noUnusedParameters` acik. Kullanilmayan degisken birakmayin.
