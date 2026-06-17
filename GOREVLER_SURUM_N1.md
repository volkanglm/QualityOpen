# Görev Planı — Sürüm N+1: "Yerel AI" (Özellik 3 + 7)

> **Kaynak**: `ROADMAP_P0_P1.md` → 🎯 Nihai Uygulama Planı
> **Kapsam**: Yerel LLM (Ollama) + Semantik Arama. İkisi paylaşılan `local_http` + provider abstraction üzerine kurulur.
> **Neden ilk**: Sidecar/kod-imzalama gerektirmez (Whisper'ın aksine); yalnız HTTP loopback. En yüksek değer/risk oranı.
> **Gerçekçi süre**: ~6–10 hafta (ideal × 2–3).
> **Ön-koşul**: Yok. (key↔sync ve audit hash-chaining N+4 sorunlarıdır; N+1'i bloklamaz.)

---

## ✅ İlerleme (2026-06-17)

**Tamamlandı + doğrulandı** (TS typecheck `0` · Rust `cargo check` temiz · vitest 16/16 · Rust 8/8 test):
- **Epic A** (A1–A4): `src-tauri/src/local_http.rs` — `local_http` / `local_http_stream` / `local_ai_health` komutları, loopback + port allowlist, 8 birim test. `lib.rs`'e kaydedildi. Yeni Cargo bağımlılığı YOK.
- **Epic B** (B1–B7): `src/lib/ai/` — `provider.ts`, 3 bulut provider (model/endpoint birebir korundu), `ollamaProvider.ts`, `providerRegistry.ts`. `ai.ts` → `resolveProvider`'a delege; `analyzeThematicCodes` `jsonMode:true` ile. `getActiveProvider()` eklendi.
- **Epic C** (C1–C4): `settings.store.ts` Ollama desteği; `localAi.store.ts` (health polling, 10sn); `LocalAiPanel.tsx` (durum/model/URL/setup guide) + `SettingsPage` entegrasyonu — birleşik **"Aktif kaynak" seçici** (Auto + bulut anahtarları + **Ollama**, her zaman görünür); `PrivacyBadge.tsx`.
- **Epic D** (D1–D3): `streamAi()` + `isActiveProviderLocal()` (`ai.ts`); `AiChatPanel.tsx` token-token streaming + **Stop** butonu (AbortController) + PrivacyBadge.

> ✅ **Doğrulama**: `pnpm build` (tsc+vite) exit 0 · vitest 16/16 · Rust 8/8. **🟢 Ara teslim ulaşıldı: yerel LLM ile sohbet çalışır (Epic A–D).**

**Sıradaki — N+1'in ikinci yarısı (Semantik Arama)**: E (`vector_store.rs` hnsw_rs + embeddings store) · F (SemanticSearchBar/Results, "Find similar") · G (transformers.js fallback + test + `v1.4.0`).

> ⚠️ Açık uçlar: `jsonrepair` eklenmedi (B6); bulut `stream()` tek-chunk fallback (yalnız Ollama gerçek streaming); LocalAiPanel/Stop metinleri literal İngilizce (i18n anahtarları rapor edildi, çeviri sonra); **runtime doğrulama yapılmadı** (canlı Ollama ile uçtan uca akış test edilmedi — yalnız derleme/test kanıtlı).

---

## Bağımlılık grafiği (yürütme sırası)

```
A (local_http Rust temeli) ──┬─► B (AiProvider abstraction) ──► C (localAi.store + Settings) ──► D (Chat)
                             └─► E (Embedding + vector_store) ──► F (Semantik UI)
                                                                       │
                                                       G (fallback + test + sürüm) ◄── hepsinden sonra
```

`A` her iki özelliğin de temelidir → **önce A bitmeli**. Sonra B→C→D (LLM hattı) ve E→F (semantik hattı) **paralel** ilerleyebilir.

---

## EPIC A — `local_http` Rust altyapısı (paylaşılan temel)

> Mevcut `native_http` (`src-tauri/src/lib.rs`) loopback'i engelleyen HTTPS-allowlist'tir. Yerel AI bunu kullanamaz; ayrı sandbox gerekir.

- [ ] **A1.** `src-tauri/src/local_http.rs` oluştur: `local_http(method, url, headers_json, body) -> (u16, String)`. Yalnız `127.0.0.1 | localhost | ::1` + port allowlist `[11434, 8080, 1234, 7860]`. `lib.rs` `invoke_handler`'a kaydet.
- [ ] **A2.** `local_http_stream(req_id, ...)` komutu: NDJSON satırlarını `app.emit("local-stream://<req_id>", chunk)` ile yayınla. Frontend AbortController → Rust request drop eşlemesi.
- [ ] **A3.** `local_ai_health(provider, base_url) -> AiHealth` komutu (latency + ulaşılabilirlik).
- [ ] **A4.** Rust birim testleri: (a) loopback-dışı host reddedilir, (b) allowlist-dışı port reddedilir, (c) `http://` loopback'e izin verilir (Ollama http).
- [ ] **A5.** `tauri.conf.json` capabilities — yeni komutlar için izin; CSP değişmez (Rust komutu).

**Çıktı**: Frontend'in `invoke("local_http", …)` ile yalnız loopback AI servislerine güvenli erişebildiği doğrulanmış komut seti.

---

## EPIC B — `AiProvider` abstraction (`ai.ts` refactor)

> Mevcut `askAi(key, messages, systemPrompt)` key-prefix routing yapıyor (`sk-ant-`→Anthropic, `AIza`→Gemini, diğer→OpenAI). İmza **korunmalı** (geri uyumlu).

- [ ] **B1.** `src/lib/ai/provider.ts` — `AiProvider` / `AiRequest` / `AiHealth` interface'leri (roadmap §3 veri modeli).
- [ ] **B2.** Mevcut 3 cloud routing'i ayrı dosyalara çıkar: `openaiProvider.ts`, `anthropicProvider.ts`, `geminiProvider.ts` (mevcut `nativeHttp` kullanır).
- [ ] **B3.** `ollamaProvider.ts` — `local_http` + `local_http_stream`; `/api/chat` (complete+stream) + `/api/tags` (modeller).
- [ ] **B4.** `providerRegistry.ts` — `resolveProvider(key|null)`: `settings.store` aktif sağlayıcıya göre cloud/local döndürür.
- [ ] **B5.** `askAi()` refactor: `key` nullable; içeride `resolveProvider().complete()`. **Tüm mevcut çağrı noktaları aynı imzayı korur** (yalnız internal routing değişir).
- [ ] **B6.** ⚠️ `analyzeThematicCodes()` DE `resolveProvider`'a bağlanmalı (sadece `askAi` değil) — yoksa tematik kodlama yerelde çalışmaz. Yerel JSON kararsızlığı için strict prompt + `jsonrepair` + retry (roadmap §3 risk).
- [ ] **B7.** `getActiveProvider()` ekle (zengin descriptor: `{type, key?, baseUrl?, model?}`) — mevcut `getActiveKey()` yalnız string döndürüyor, yerelin anahtarı yok. `resolveProvider` bunu kullanır.
- [ ] **B8.** Unit test: her provider (3 cloud + ollama) mock `local_http`/`native_http` ile; `resolveProvider` factory; bulut↔yerel geçişte 5 çağrı noktasının da çalıştığı.

---

## EPIC C — `localAi.store` + Settings paneli

- [ ] **C1.** `src/store/localAi.store.ts` — Ollama sağlık polling'i (durum, yüklü modeller, latency). Paylaşılan store (Özellik 1 ve 7 ileride kullanır).
- [ ] **C2.** `settings.store.ts` genişlet: `DefaultProvider`'a `"ollama"` ekle; `ollamaBaseUrl` + `ollamaModel` alanları (`partialize`'a ekle — hassas değil). Bulut anahtarları keychain'de kalır.
- [ ] **C3.** **Birleşik AI Settings UI** (`SettingsPage.tsx` içinde) — iki tam yapılandırılabilir bölüm + **tek "Aktif kaynak" seçici** (Bulut | Yerel). Her iki kullanıcı tipi de aynı özellikleri kullanır; seçim anlık geçişli.
  - Bulut bölümü: 3 anahtar alanı + bulut-varsayılan seçici (mevcut UI'dan genişletilir).
  - Yerel bölümü: `components/settings/LocalAiPanel.tsx` — Ollama durumu, model listesi (`/api/tags`), "Kurulum rehberi" (macOS/Win/Linux), "Yenile".
  - Aktif kaynak değişince hiçbir özellik kodu değişmez (yalnız `resolveProvider` farklı döner).
  - 🔒 **Karar (2026-06-17)**: N+1'de **tek "Aktif kaynak"** modeli. Özellik-bazında sağlayıcı eşleştirme (sohbet→X, kodlama→Y) bilinçli olarak **backlog**'a alındı.
- [ ] **C4.** `components/common/PrivacyBadge.tsx` — `🔒 100% on-device` (Özellik 1 ve 7 ile **paylaşılır**).

---

## EPIC D — Chat entegrasyonu

- [ ] **D1.** `AiChatPanel.tsx` — streaming yanıt + "Durdur" (AbortController), provider üzerinden. (Not: localStorage key bug'ı zaten yok; `getActiveKey()` kullanıyor.)
- [ ] **D2.** Local sağlayıcı seçiliyken `PrivacyBadge` göster.
- [ ] **D3.** Ollama down ise health uyarısı + "Setup guide" kısayolu.

**🟢 Ara teslim**: Bu noktada yerel LLM ile sohbet çalışır. İstersen Semantik'i ayrı mini-sürümde verebilirsin.

---

## EPIC E — Semantik arama altyapısı

- [ ] **E1.** `EmbeddingProvider` abstraction + `ollamaEmbedding.ts` (`/api/embeddings`, nomic-embed-text) `local_http` üzerinden.
- [ ] **E2.** **Vektör deposu kararı**: `hnsw_rs` (pure Rust — Windows derlemesi kolay) öncelikli; sqlite-vss ertelenir. `src-tauri/src/vector_store.rs`: `vector_init/upsert/search/delete`.
- [ ] **E3.** ⚠️ **Persist stratejisi**: `hnsw_rs` bellek-içidir → açılışta diskten yükle / kapanışta serialize. App-data dizini.
- [ ] **E4.** ⚠️ **JS/Rust veri yaşam döngüsü**: proje silinince vektörler de silinmeli (`project.store` → `vector_delete` köprüsü). Roadmap'in atladığı nokta.
- [ ] **E5.** `embeddings.store.ts` — index durumu (total/indexed/pending), aktif model, `embeddingMeta.model` (model değişince reindex uyarısı).

---

## EPIC F — Semantik arama UI

- [ ] **F1.** `components/search/SemanticSearchBar.tsx` + `SemanticResults.tsx` — citation (`🎯 92% · interview_03:14`), "Jump to source".
- [ ] **F2.** Manuel "Index project" (segment-only, MVP). İlerleme göstergesi.
- [ ] **F3.** Segment context menüsü → "🧠 Benzer segmentleri bul" (kosinüs top-10).

---

## EPIC G — Yedek yol + test + sürüm

- [ ] **G1.** `transformers.js` fallback (Ollama yoksa) — `tesseract.js` precedent'i (`PdfRenderer.tsx` dinamik import paterni).
- [ ] **G2.** Testler: kosinüs similarity (saf TS); `vector_search` golden (referans vektörler); CI'da Ollama container (⚠️ CI yükü — Yapısal Risk #6).
- [ ] **G3.** `v1.4.0` sürümü kes (pipeline N+1 öncesi doğrulandı → güvenli).

---

## N+1 sonrası milestone'lar (ŞİMDİ ayrıntılandırılmaz)

| Sürüm | İçerik | Açılış koşulu |
|---|---|---|
| 🟡 **N+2** | Vaka (Ö5) + Sorgu (Ö6) | N+1 teslim edildikten sonra; TEK koordineli DB migration tasarımı |
| 🟠 **N+3** | ICR (Ö2) + **yalnız** Tematik (Ö8) | — |
| 🔵 **N+4** | PII MVP (Ö4) | Önce: audit hash-chaining + key↔sync kararı (Risk #3) |
| ⚪ Backlog | Whisper, GT/FA/PH, PII-tam | Talep + kapasite kanıtı |

---

## Hemen başlanacak ilk 3 görev
1. **A1** — `local_http.rs` (loopback + port allowlist) + `lib.rs` kaydı
2. **A4** — güvenlik birim testleri (loopback-dışı / port-dışı reddi)
3. **B1** — `AiProvider` interface (A bitmeden tasarlanabilir)
