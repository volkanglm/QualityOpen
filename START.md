# START.md — AI Asistani Giris Noktasi

> Bu dosyayi her yeni oturumun basinda okut. Tum proje baglami, yapilacaklar
> ve dosya haritasi burada. Baska bir dosya aramana gerek yok.

---

## PROJE KIMLIK

- **Isim:** QualityOpen (QualityOpenQDA)
- **Tur:** Nitel Veri Analiz Platformu (QDA) — masaustu aplikasyon
- **Platformlar:** macOS + Windows (Tauri v2)
- **Stack:** React 19 + TypeScript (strict) + Vite 7 + Tailwind CSS v4 + Zustand 5 + @xyflow/react 12
- **Build:** `pnpm dev` | `pnpm build` | `pnpm tauri dev` | `pnpm test`

---

## DOKUMAN HARITASI (Okunma Sirasi)

Asagidaki dosyalari SIRASIYLA oku. Her dosya belirli bir amaca hizmet eder:

| # | Dosya | Amac | Ne Zaman Oku |
|---|-------|------|--------------|
| 1 | `AI_CONTEXT_ARCHITECTURE.md` | Proje mimarisi, tech stack, dizin yapisi, kod standartlari, veri akisi, build komutlari | Her oturumda mutlaka |
| 2 | `AI_CONTEXT_MINDMAP_CODEBASE.md` | Mindmap ozelliginin mevcut kod tabani referansi — dosya listesi, tipler, store API, mekanizmalar, bilinen sorunlar | Mindmap uzerinde calisacaksan |
| 3 | `MINDMAP_ANALYSIS.md` | Mevcut mindmap ozelliginin detayli analizi — bilesenler, veri modeli, state akisi | Genel baglam icin |
| 4 | `FUTUREMINDMAP.md` | Yapilacak tum iyilestirmeler ve oncelik siralamasi | Ne yapilacagini anlamak icin |
| 5 | `AI_CONTEXT_IMPLEMENTATION_GUIDE.md` | Gorev gorev implementasyon rehberi — hangi dosya degisecek, nasil kod yazilacak, tuzaklar | Kod yazarken referans olarak |

---

## YAPILACAK ISLER (Oncelik Sirasina Gore)

### P0 — Acil / Yuksek Etki

| Gorev | Aciklama | Effort | Rehber Bolumu |
|-------|----------|--------|---------------|
| Tip Guvenligi | `any[]` → strict React Flow Node/Edge generic tipleri | Dusuk | IMPLEMENTATION_GUIDE Gorev 0 |
| Undo/Redo | Canvas icin undo/redo stack + Ctrl+Z/Ctrl+Y | Orta | IMPLEMENTATION_GUIDE Gorev 1 |
| Klavye Kisayollari | Delete, Ctrl+D, Ctrl+A, Tab, Enter | Dusuk | IMPLEMENTATION_GUIDE Gorev 2 |

### P1 — Onemli

| Gorev | Aciklama | Effort | Rehber Bolumu |
|-------|----------|--------|---------------|
| Auto-Layout | d3-force ile force-directed layout, "Auto Arrange" butonu | Orta | IMPLEMENTATION_GUIDE Gorev 3 |
| Kenar Etiket UI | Cift tikla ile inline etiket girme | Dusuk | IMPLEMENTATION_GUIDE Gorev 4 |
| Coklu Harita | Proje basina birden fazla harita, harita secici UI | Orta | IMPLEMENTATION_GUIDE Gorev 5 |
| Arama & Filtreleme | Harita ici Ctrl+F arama, dugum tipi filtresi | Orta | IMPLEMENTATION_GUIDE Gorev 6 |

### P2 — Iyi Olur

| Gorev | Aciklama | Effort | Rehber Bolumu |
|-------|----------|--------|---------------|
| Group Node | Container dugum tipi | Orta | IMPLEMENTATION_GUIDE Gorev 7 |
| QDA Otomatik Harita | Code co-occurrence, doc-code network, code tree map | Yuksek | IMPLEMENTATION_GUIDE Gorev 8 |
| Zengin Dugum Tipleri | Image, Link, Rich Text, Embedded Chart | Orta | FUTUREMINDMAP Bolum 5 |

### P3 — Nice to Have

| Gorev | Aciklama | Effort | Rehber Bolumu |
|-------|----------|--------|---------------|
| Alignment Guides | Smart guides, snap to grid | Yuksek | FUTUREMINDMAP Bolum 9 |
| Real-time Collaboration | Firebase CRDT ile canli duzenleme | Cok Yuksek | FUTUREMINDMAP Bolum 10 |

### Quick Fix

| Gorev | Aciklama | Effort |
|-------|----------|--------|
| MemoNode Silme | X butonu eksik, CodeNode'daki gibi ekle | 15 dk |

---

## DOSYA DUZENLEME REHBERI

Bir gorev uzerinde calisirken hangi dosyalari duzenleyecegini bil:

### Mindmap Canvas ile ilgili HERHANGI bir is yaparken:
- **Ana dosya:** `src/components/ConceptMapBoard.tsx`
- **Dugum tipleri:** `src/components/canvas/CodeNode.tsx`, `MemoNode.tsx`, `QuoteNode.tsx`
- **Kenar:** `src/components/canvas/LabeledEdge.tsx`
- **Sag panel:** `src/components/canvas/AssetsPanel.tsx`
- **Store:** `src/store/project.store.ts` (satir 609-654 arasi conceptMap actions)
- **Tipler:** `src/types/index.ts` (satir 146-154 arasi ConceptMap interface)

### Yeni dugum tipi eklerken:
1. `src/components/canvas/YeniNode.tsx` olustur
2. `src/components/ConceptMapBoard.tsx` → `nodeTypes` objesine ekle
3. `src/types/index.ts` → yeni data interface ekle
4. `src/components/canvas/AssetsPanel.tsx` → gerekirse yeni sekme/og ekle
5. 8 locale dosyasina yeni i18n key'leri ekle

### Store action eklerken:
1. `src/store/project.store.ts` → interface'e action tanimi ekle (satir 40-130 arasi)
2. Ayni dosyada implementasyon ekle (satir 655-oncesi)
3. `src/types/index.ts` → gerekli tip tanimlari

### Yeni sayfa/view eklerken:
1. `src/types/index.ts` → `ViewMode` union'a ekle
2. `src/components/panels/CenterPanel.tsx` → routing ekle
3. `src/components/panels/LeftPanel.tsx` → nav butonu ekle

### i18n key eklerken:
Tum bu dosyalara ayni key'i ekle:
- `src/locales/tr.ts`
- `src/locales/en.ts`
- `src/locales/de.ts`
- `src/locales/es.ts`
- `src/locales/nl.ts`
- `src/locales/fr.ts`
- `src/locales/it.ts`
- `src/locales/pt.ts`

---

## KOD STANDARTLARI (Kisa Referans)

| Kural | Detay |
|-------|-------|
| Yorum | **YORUM YAZMA** — kullanici tercihi |
| Import | `@/` alias kullan, relative import yok |
| CSS | Tailwind utility + `var(--xxx)` custom properties |
| State | Zustand store'lar `src/store/` altinda |
| Tip | TypeScript strict, `noUnusedLocals` acik |
| Test | Vitest, `pnpm test` |
| Lisans | `useLicenseStore.getState().isPro` ile kontrol |
| Tema | Dark/light, `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)` |
| Animasyon | Framer Motion |
| Ikon | Lucide React |
| Buton | `<Button variant="primary|ghost|outline|danger" size="sm|md|lg|icon">` |
| Class birlestirme | `cn("base", condition && "extra")` |
| UUID | `crypto.randomUUID()` |

---

## LISANS KONTROLU PATERNI

Yeni dugum/ozellik eklerken free kullanici limiti kontrolu:

```typescript
const { isPro, openModal } = useLicenseStore.getState();
if (!isPro && nodes.length >= LIMIT) {
  openModal();
  pushToast(t("project.limit.mapNodeCount"), "error");
  return;
}
```

Free limitleri:
- Dugum: 5/harita
- Dokuman: 3/proje

---

## CALISMA AKISI ONERISI

1. Kullanici hangi gorevi istedigini soyler
2. Sen `AI_CONTEXT_IMPLEMENTATION_GUIDE.md`'den ilgili gorevun rehberini okursun
3. `AI_CONTEXT_MINDMAP_CODEBASE.md`'den mevcut kod referansini kontrol edersin
4. Kodu yazarsin
5. `pnpm build` ile TypeScript check yaparsin
6. Kullaniciya degisiklikleri ozetlersin
