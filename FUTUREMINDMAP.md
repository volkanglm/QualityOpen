# Mindmap / Visualizer — State of the Art Gelistirme Plani

Proje kodunu derinlemesine inceledim. Mevcut durum ve modern standartlar (Miro, Obsidian Canvas, Notion, Affinity, etc.) arasindaki farklari kategorize ederek oneriler:

---

## 1. VERI MODELI & TIPLER (Kritik)

**Mevcut sorun:** `nodes: any[]`, `edges: any[]` — tip guvenligi yok.

**Oneri:**
```typescript
// Tum node/edge tiplerini strict tanimla
interface ConceptMapNode extends Node {
  type: 'memo' | 'code' | 'quote' | 'image' | 'link' | 'group';
  data: MemoNodeData | CodeNodeData | QuoteNodeData | ...;
  measured?: { width: number; height: number };
}

interface ConceptMapEdge extends Edge {
  type: 'labeled' | 'hierarchy' | 'association';
  data: EdgeData;
}
```

---

## 2. OTOMATIK LAYOUT (En buyuk eksik)

**Mevcut:** Manuel pozisyonlama sadece. Buyuk haritalarda duzensizlesiyor.

**Oneriler:**
- **d3-force** zaten `devDependencies`'te var ama kullanilmamis. Force-directed graph layout eklenmeli.
- **Hierarchical (dagre/elkjs):** Kod agaci hiyerarsisi icin top-down/sol-sag layout.
- **Radial layout:** Merkezi tema etrafinda dallanma.
- Kullanici tek tikla layout degistirebilmeli: "Auto Arrange" butonu.

---

## 3. COKLU HARITA DESTEGI

**Mevcut:** Proje basina 1 harita (`find` ile ilk eslesen).

**Oneri:**
- `conceptMaps: ConceptMap[]` zaten dizi — UI'da harita listesi + olusturma/silme eklenmeli.
- Sekmeli (tab) navigasyon veya sol panel'de harita listesi.
- Harita sablonlari (blank, SWOT, fishbone, thematic analysis template).

---

## 4. UNDO/REDO SISTEMI (Eksik)

**Mevcut:** Store'da `snapshot/before/after` var ama canvas icin undo/redo yok.

**Oneri:**
- React Flow'un `onNodesChange`/`onEdgesChange` event'lerini yakalayip bir `undoStack`/`redoStack` mekanizmasi kur.
- `Ctrl+Z` / `Ctrl+Shift+Z` destegi.
- Zustand middleware ile `temporal` plugin kullanilabilir.

---

## 5. ZENGIN DUGUM TIPLERI

**Mevcut:** 3 dugum tipi (memo, code, quote).

**Oneri:**
- **Group Node:** Diger dugumleri icine alan container (React Flow'nun `group` tipi ile).
- **Image Node:** Gorsel ekleme destegi.
- **Link Node:** Web URL veya harici dosya referansi.
- **Rich Text Node:** Markdown veya WYSIWYG editor destegi (TipTap, Lexical).
- **Embedded Chart:** Analiz grafiklerini haritaya gomme.

---

## 6. KENAR (EDGE) IYILESTIRMELERI

**Mevcut sorun:** Kenar etiketi programmatically bos string atanıyor, kullanicinin UI ile giris yolu yok.

**Oneriler:**
- Kenara cift tikla → inline text input ile etiket girme.
- **Directed/Undirected** secenegi (oklu/okusuz).
- **Animated edges:** Akis gosterimi icin animasyonlu kenarlar (CSS `stroke-dashoffset` animation).
- **Edge smoothstep** opsiyonu (right-angle connections, UML tarzi).
- **Self-referencing edge:** Ayni dugume donen kenar.

---

## 7. ARAMA & FILTRELEME (Eksik)

**Oneriler:**
- **Harita ici arama:** `Ctrl+F` ile dugum/kenar iceriginde arama, bulunan dugume zoom.
- **Filtre:** Dugum tipine gore goster/gizle (sadece kodlari goster, vs.).
- **Highlight:** Arama sonucu eslesen dugumleri vurgula.

---

## 8. KLAVYE KISAYOLLARI (Eksik)

**Oneriler:**
| Kisayol | Aksiyon |
|---------|---------|
| `Delete` / `Backspace` | Secili dugum/kenari sil |
| `Ctrl+D` | Secili dugumu kopyala |
| `Ctrl+A` | Tumunu sec |
| `Ctrl+Z` / `Ctrl+Y` | Undo/Redo |
| `Space+Drag` | Pan |
| `Ctrl+Scroll` | Zoom |
| `Tab` | Secili dugumden yeni cocuk dugum olustur |
| `Enter` | Dugumu duzenle |
| `Ctrl+L` | Auto-layout |

---

## 9. GORSEL IYILESTIRMELER

**Oneriler:**
- **Dark/Light tema responsive dugum stilleri:** Mevcut dugumler Tailwind dark class'larina bagimli — React Flow theme ile entegrasyon eksik.
- **Snap to grid:** Dugumleri grid'e hizala.
- **Alignment guides:** Sketch/Figma tarzi smart guides (dugumler arasi mesafe/hizalama).
- **Minimap interaktif:** Mevcut MiniMap statik — tikla-zoom eklenmeli.
- **Presentation mode:** Tum UI'ler gizlenip sadece canvas fullscreen.

---

## 10. ISBIRLIGI & PAYLASIM

**Oneriler:**
- **Real-time collaboration:** Firebase zaten projede var — CRDT/OT ile canli isbirlikci duzenleme.
- **Comments/Annotations:** Dugumlere yorum ekleme.
- **Export iyilestirmesi:** SVG export (vector), JSON import/export (interoperability).
- **Mermaid/PlantUML import:** Metin tabanli diagramlardan otomatik harita olusturma.

---

## 11. QDA-OZEL OZELLIKLER

Bu bir nitel analiz araci — diger QDA araclari (NVivo, ATLAS.ti, MAXQDA) ile karsilastirildiginda:

- **Code co-occurrence'dan otomatik harita olusturma:** Iki kodun ayni segmentte bulunma yogunluguna bagli kenar olusturma.
- **Document-to-code network:** Hangi kodlar hangi belgelerde yogun — otomatik ag grafigi.
- **Thematic map from codes:** Kod hiyerarsisinden otomatik hiyerarsik harita.
- **Segment linkback:** QuoteNode'a tiklandiginda ilgili segmentin belgedeki konumuna scroll.
- **Code tree → Concept map:** Sol panel'deki kod agaci yapisi tek tikla haritaya cevrilebilmeli.

---

## ONCELIK SIRASI (ROI Bazli)

| Oncelik | Ozelik | Etki | Effort |
|---------|--------|------|--------|
| **P0** | Tip guvenligi (any[] → strict) | Yuksek | Dusuk |
| **P0** | Undo/Redo | Yuksek | Orta |
| **P0** | Klavye kisayollari | Yuksek | Dusuk |
| **P1** | Auto-layout (d3-force) | Yuksek | Orta |
| **P1** | Kenar etiket UI'i | Orta | Dusuk |
| **P1** | Coklu harita destegi | Yuksek | Orta |
| **P1** | Arama & filtreleme | Orta | Orta |
| **P2** | Group node | Orta | Orta |
| **P2** | QDA-ozel otomatik harita olusturma | Yuksek | Yuksek |
| **P2** | Zengin dugum tipleri (image, link) | Orta | Orta |
| **P3** | Alignment guides | Dusuk | Yuksek |
| **P3** | Real-time collaboration | Yuksek | Cok Yuksek |
