# QualityOpen — Yol Haritası: P0 & P1 Özellikleri (1–11)

> **Sürüm**: 1.0 · **Tarih**: 16 Haziran 2026
> **Kapsam**: Offline-first ethos'a en uygun, en yüksek etki sağlayacak 11 özelliğin uygulama-ready spesifikasyonları.
> **Hazırlayan**: CEO (Orchestrator) — @cto, @database-admin, @security-auditor, @product-manager alt-ajanlarının paralel katkılarıyla konsolide edildi.

---

## 🔍 Kod Tabanı Doğrulama Notu (2026-06-17)

> Bu belgedeki "mevcut altyapı" iddiaları kod tabanına karşı doğrulandı. Çoğu **doğru** çıktı; aşağıdaki düzeltmeler uygulama öncesi dikkate alınmalıdır.

**✅ Doğrulandı (gerçekten mevcut, genişletilebilir):**
- Saturation grafiği — `src/components/analysis/SaturationChart.tsx` (radar değil, zaman-serisi alan grafiği; kategori-bazlı boyut yok)
- Tematik ağ — `src/components/charts/ThematicNetwork.tsx` (basit dairesel yerleşim; **"Anchor Node" kavramı yok**)
- Reflexivity journal — `src/pages/ReflexivityPage.tsx`
- Code Matrix Heatmap — `src/components/charts/CodeHeatmap.tsx` (sayı tabanlı — Framework Matrix "özet metin" ayrımı geçerli)
- Disconfirming "Zap" — `Segment.isDisconfirming` + `toggleDisconfirming` + RightPanel Zap ikonu
- Code tree — `Code.parentId` ile hiyerarşi (**`level: 'category'` alanı YOK — eklenmeli**)
- Memo editör — `src/pages/MemosPage.tsx` (**düz `<textarea>`; Markdown render YOK** — "Markdown editor/journal" iddiaları yanıltıcı)

**⚠️ Düzeltilmesi gereken yanlış iddialar:**
1. **Audit hash-chained DEĞİL.** Mevcut `AuditLogEntry` düz append-only dizi (`{action, timestamp, details}`); `hash`/`prevHash` yok, yalnız 4 aksiyon: `CREATE_CODE / UPDATE_CODE / DELETE_CODE / MOVE_CODE`. PII'nın `auditTrailHash` "kriptografik tahrif kanıtı" iddiası ve KBF #4 **bir ön-koşuldur, mevcut değildir** — hash-chaining önce ayrı bir altyapı işi olarak inşa edilmelidir.
2. **`ProjectStyle` tipi yok.** Gerçekte `Project.projectType?: "primary" | "meta-synthesis"`. Metodoloji stilleri bu mevcut alanı genişletmeli (yeni bir `ProjectStyle` tipi değil).
3. **`AiChatPanel.tsx:117` "localStorage bug" zaten düzeltilmiş.** Bileşen `useSettingsStore().getActiveKey()` + OS keychain kullanıyor; o refactor maddesi geçersiz.
4. **DB_VERSION koordinasyonu eksik.** `DB_VERSION` mevcutta **1**. Whisper (Ö1), Cases (Ö5), PII (Ö4), Sorgu (Ö6) ve ICR (Ö2) **ayrı ayrı** "v2'ye yükselt" diyor — çakışır. Tek bir koordineli migration TÜM şema değişikliklerini kapsamalı.

> Satır numarası referansları (örn. `lib.rs:65-96`, `settings.store.ts:175-179`) yaklaşık/eski olabilir — uygulama anında yeniden doğrulanmalı.

---

## ⚠️ Yapısal Riskler ve Karar Noktaları

> Aşağıdakiler tek tek özelliklerle değil, **plan olarak belgenin bütünüyle** ilgilidir. Aşağıdaki "🎯 Nihai Uygulama Planı" bu riskleri dikkate alacak şekilde revize edilmiştir.

| # | Risk | Neden sorun | Karar / Düzeltme |
|---|------|-------------|------------------|
| 1 | **"11 özellik = P0/P1" gerçek önceliklendirme değil** | Toplam ~18 ay solo iş; her şey "P0" ise hiçbiri P0 değil; kullanıcı talebi kanıtı yok; sıra mantıksal bağımlılığa göre, kullanıcı değerine göre değil | Sonraki sürüm = **2–3 özellik**; gerisi backlog. |
| 2 | **Efor tahminleri iyimser + tutarsız** | Aynı özellik için farklı sayılar; hata ayıklama / CI bakımı / akademik danışman zamanı yok sayılmış | Solo gerçek süre ≈ ideal × **2–3**. Geçmiş hızı baz al (v1.3.9 release CI = haftalar). |
| 3 | **PII: cihaz-bağlı şifreleme ↔ çoklu-cihaz sync çelişkisi** | Keychain master key cihaz-yereldir; şifreli PII ikinci cihazda (Drive sync sonrası) **çözülemez** | Kodlamadan ÖNCE seç: (a) PII şifreli verisi sync **edilmez**, **veya** (b) parola-türevli anahtar (her cihazda KDF ile yeniden türetilir). |
| 4 | **Whisper imzalama gerçeği** | 4 platform × sidecar binary × notarization; v1.3.9'da **tek** binary'yi imzalamak haftalar aldı | Whisper **en sona**; ilk iş sidecar/imzalama gerektirmeyen LLM + Semantik. |
| 5 | **4 metodoloji birden = dar kitle için orantısız** | 30+ hafta; her biri akademik danışman ister; giderek daralan kitle | Önce **yalnız Tematik**'i uçtan uca yap + gerçek kullanıcıyla doğrula; sonra GT/FA/PH kararı. |
| 6 | **CI yükü görünmez** | Ollama container + Python nltk cross-check + 4-platform sidecar = kalıcı bakım vergisi | CI bakımını efor tahminine **dahil et**. |
| 7 | **Telemetri ↔ offline ethos çelişkisi** | "%70 yerel seçer" gibi metrikler telemetri gerektirir; ama ethos "hiçbir şey cihazı terk etmez" | Telemetriyi opt-in netleştir **veya** metriği yerel/kullanıcı-bildirimli yap. |

---

## 📋 Yönetici Özeti

Bu belge, QualityOpen'u NVivo / ATLAS.ti / MAXQDA'dan **gerçek anlamda ayıran** 11 özelliğin detaylı spesifikasyonunu içerir. Her özellik: kullanıcı hikayeleri, kabul kriterleri, TypeScript veri modelleri, Tauri/Rust katmanı, UI/UX tasarımı, faz bazlı uygulama planı, test stratejisi, riskler ve başarı metrikleri ile tanımlanmıştır.

### Öncelik ve Efor Matrisi

> ⚠️ Bu tablo **orijinal niyeti / özellik envanterini** belgeler; gerçek teslim sırası ve önceliklendirme için aşağıdaki **"🎯 Nihai Uygulama Planı"** esastır (bkz. Yapısal Risk #1). Efor değerleri "ideal"dir — gerçekçi süre için × 2–3 (Yapısal Risk #2).

| # | Özellik | Öncelik | Etik | Efor (tek geliştirici) |
|---|---------|---------|------|-------------------------|
| 1 | Yerel Whisper Transkripsiyonu | P0 | ✅ Offline | ~18 iş günü |
| 2 | İnter-Kodlayıcı Güvenilirlik (ICR) | P0 | ✅ Akademik zorunluluk | ~30 iş günü |
| 3 | Yerel LLM (Ollama/llama.cpp) | P0 | ✅ Offline | ~15 iş günü |
| 4 | PII Tespiti & Anonimleştirme | P0 | ✅ Etik/KVKK | ~10–14 hafta |
| 5 | Vaka & Öznitelik Sistemi | P1 | ✅ | ~21–27 iş günü |
| 6 | Gelişmiş Sorgu Oluşturucu | P1 | ✅ | ~22–28 iş günü |
| 7 | Semantik Arama (Yerel Embedding) | P1 | ✅ Offline | ~17 iş günü |
| 8 | Tematik Analiz Sihirbazı (Braun & Clarke) | P1 | ✅ Metodoloji | ~7.5 hafta |
| 9 | Gömülü Teori Araç Seti | P1 | ✅ Metodoloji | ~10 hafta |
| 10 | Çerçeve Analizi (Ritchie & Spencer) | P1 | ✅ Metodoloji | ~10 hafta |
| 11 | Fenomenoloji Araç Seti | P1 | ✅ Metodoloji | ~9.5 hafta |

### 🎯 Nihai Uygulama Planı (önceliklendirilmiş)

> İlke: **bağımlılık + risk + kullanıcı değeri** sırası. "Hepsini planla" yerine "azar azar bitir + doğrula". Tahminler **gerçekçi (ideal × 2–3)** verilmiştir; her sürüm bağımsız olarak teslim edilebilir.

```
🟢 SÜRÜM N+1 — "Yerel AI"  (ilk teslim · ~6–10 hafta gerçekçi)
   3. Yerel LLM (Ollama)   → yalnız local_http; sidecar/imzalama YOK
   7. Semantik Arama       → aynı local_http + embedding (Ollama nomic / transformers.js)
   ▸ En yüksek değer/risk oranı. Paylaşılan local_http + AiProvider abstraction'ı kurar.

🟡 SÜRÜM N+2 — "Veri Modeli"  (~10–16 hafta gerçekçi)
   5. Vaka & Öznitelik      → TEK koordineli DB migration (v1→v2)
   6. Sorgu Oluşturucu      → F5'e bağlı AST
   ⚠ TÜM şema değişikliklerini (1,2,4,5,6) tek migration'da topla — özellik bazında ayrı bump YOK.

🟠 SÜRÜM N+3 — "Güvenilirlik + Metodoloji Pilotu"  (~12–18 hafta gerçekçi)
   2.  ICR & Çoklu Kodlayıcı → migration koordineli
   8.  Tematik Analiz Sihirbazı (TEK metodoloji) → WizardShell + phaseMachine BURADA kurulur
   ▸ 9/10/11 (GT/Framework/Fenomenoloji) Tematik GERÇEK kullanıcıyla doğrulanmadan başlatılmaz (Risk #5).

🔵 SÜRÜM N+4 — "Gizlilik (MVP)"  (~6–8 hafta gerçekçi · DE-SCOPED)
   ▸ Ön-koşul: Audit hash-chaining (ayrı altyapı işi — mevcut audit düz dizidir)
   4.  PII MVP: regex + checksum tespit → redact/keep → manuel inceleme → audit kaydı
   ❌ Ertelendi: AES key-wrapping, BIP-39 recovery, çok-dilli NER, consent, risk skoru
   ⚠ Karar #3 (key ↔ sync çelişkisi) bu sürüm BAŞLAMADAN çözülmeli.

⚪ BACKLOG — talep + kapasite kanıtıyla değerlendirilir (şimdi planlanmaz)
   1.        Whisper Transkripsiyonu  → sidecar imzalama riski; en sona (Risk #4)
   9/10/11.  GT / Framework / Fenomenoloji → Tematik doğrulandıktan sonra
   4-tam.    PII tam sürüm (NER, consent, çok-dil, recovery)
```

> **Not**: Bu plan, eski "Faz A–D" sırasını **geçersiz kılar**. Temel fark: Whisper artık ilk değil son; PII MVP'ye indirildi ve audit hash-chaining ön-koşulu eklendi; metodolojiler "4 paralel" yerine "önce Tematik, sonra doğrulamaya bağlı".

> **Not**: `DB_VERSION` mevcutta **1**. Whisper (Ö1), Cases (Ö5), PII (Ö4), Sorgu (Ö6) ve ICR (Ö2) **hepsi** ayrı ayrı şema değişikliği istiyor — her biri bağımsız "v2'ye yükselt" derse çakışır. **Tek bir koordineli migration** TÜM bu şema değişikliklerini kapsamalı; özellik bazında ayrı bump YAPILMAMALI.

---

## 🔗 Paylaşılan Mimari Kararları (Birçok Özelliği Bağlar)

### A. `local_http` Rust Komutu (Özellik 1, 3, 7)
Mevcut `native_http`'un SSRF allowlist'i (`src-tauri/src/lib.rs:65-96`) **127.0.0.1/localhost'u açıkça engeller**. Bu yüzden tüm yerel AI çağrıları (Ollama @ `:11434`, llama.cpp, whisper sidecar) yeni bir `local_http` Rust komutundan geçer — yalnızca loopback + bilinen AI servis portlarına (`11434, 8080, 1234, 7860`) izin verir. Bu, güvenlik modelini korur (cloud allowlist'li, local ayrı sandbox) ve desktop/web ayrımını temiz tutar.

### B. `AiProvider` / `EmbeddingProvider` / `TranscriptionProvider` Abstraction (Özellik 1, 3, 7)
Tüm AI sağlayıcıları aynı pattern'i izler: `{ complete(), stream(), healthCheck() }` interface → cloud ve local implementasyonlar → `providerRegistry` factory. Mevcut `askAi()` fonksiyonu provider-agnostic hale getirilir.

### C. `localAi.store.ts` Birleşik Sağlık Durumu (Özellik 1, 3, 7)
Tek Zustand store, üç yerel servisin (Ollama, whisper sidecar, embedding modeli) sağlığını poll eder. UI'da tek "Local AI Status" göstergesi (Settings + status bar).

### D. `PrivacyBadge` Bileşeni (Özellik 1, 3, 7)
`<PrivacyBadge provider="ollama" />` → "🔒 100% on-device". Transkripsiyon paneli, chat paneli ve arama panelinde paylaşılır.

### E. `tauri-plugin-shell` Sidecar Yönetimi (Özellik 1)
Yalnızca whisper.cpp sidecar için. Ollama (HTTP) ve transformers.js (WASM) sidecar gerektirmez.

### F. Metodoloji Paylaşılan Altyapısı (Özellik 8–11)
- `src/lib/methodology/phaseMachine.ts` — `linear` (TA, Framework) ve `cyclic` (GT) modlar.
- `src/lib/methodology/deliverableValidator.ts` — gating doğrulama.
- `src/lib/methodology/reporters/` — her metodoloji için Methods bölümü üretici.
- `src/store/methodologyStore.ts` — ortak state, geçmiş, faz atlamaları.
- `src/components/methodologies/MethodologyWizardShell.tsx` — sol stepper + orta faz kartı + sağ reflexive prompt.

### G. Çapraz-Özellik Entegrasyon Matrisi

| Özellik | 1 (Whisper) | 2 (ICR) | 3 (LLM) | 4 (PII) | 5 (Vaka) | 6 (Sorgu) | 7 (Semantik) | 8–11 (Metod.) |
|---------|---|---|---|---|---|---|---|---|
| **2 ICR** | — | — | — | — | cross-tab cache anahtarına `coderLayer` | `coderFilter` parametresi | — | TA: yalnız coding-reliability; GT/PH: ✗ |
| **5 Vaka** | — | ↑ | — | katılımcı ↔ consent | — | `case`/`caseGroup`/`attribute` node'ları | — | GT: sampling; FA: matris satırları; PH: katılımcılar |
| **6 Sorgu** | — | ↑ | — | — | ↑ | — | — | opsiyonel |
| **7 Semantik** | transcript için "find similar" | — | aynı Ollama daemon | — | — | — | — | saturation radar beslemesi |
| **8–11** | — | ↑ | — | — | ↑ | — | ↑ | paylaşılan WizardShell |

---

# Bölüm 1 — AI Altyapısı (Özellik 1, 3, 7)

---

## 1. Yerel Ses/Video Transkripsiyonu (Whisper)

### 🎯 Amaç ve Değer Önerisi

NVivo ve ATLAS.ti gibi rakiplerin transkripsiyon özellikleri neredeyse her zaman bulut tabanlıdır ve araştırmacıların **katılımcıların ses kayıtlarını üçüncü taraf sunuculara yüklemesini** gerektirir. Bu, hassas mülakat verileri (sağlık çalışanları, travma mağdurları, whistle-blower'lar) için ciddi bir etik sorun yaratır ve çoğu üniversite Etik Kurul (IRB) onayını imkânsız kılar.

QualityOpen'un transkripsiyon özelliği **tamamen cihaz üzerinde (on-device)** çalışır: `whisper.cpp` (GGML formatında kuantize edilmiş Whisper modelleri) bir **Tauri Rust sidecar** olarak paketlenir ve hiçbir ses verisi diski terk etmeden metne dönüştürülür. Mevcut `transcriptionService.ts` zaten bulut Whisper + SRT/VTT import destekliyor; bu özellik onu **üç katmanlı** bir mimariye genişletir: (1) Yerel Whisper sidecar [varsayılan, offline], (2) Mevcut bulut Whisper API [BYOK hız tercihi], (3) Manuel SRT/VTT import [mevcut].

**Kim yararlanır**: Saha mülakatı yapan antropologlar, odak grup araştırmacıları, podkast/nitel analiz yapan gazeteciler, kırsal veya düşük bant genişlikli bölgelerde çalışan saha ekipleri. Ethos'a uyum: **100% offline varsayılan**, bulut yalnızca kullanıcı açıkça tercih ederse ve BYOK anahtarı girerse devreye girer.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1**: Bir araştırmacı olarak, internet bağlantısı olmadan 1 saatlik mülakat sesini transkribe etmek istiyorum.
  - **Acceptance**: `MediaWorkspace` "Transcribe" menüsünde "Local Whisper" seçeneği varsayılan; internet kesintisinde dahi çalışır; ilerleme çubuğu segment bazında güncellenir; çıktı `Document.transcript`'e yazılır ve IndexedDB'ye persist edilir.
- **US2**: İlk kez transkripsiyon yaparken model boyutu (tiny/base/small/medium/large) seçmek istiyorum.
  - **Acceptance**: Model seçim modalı her seçenek için indirme boyutu (MB), RAM tahmini, hız (xRT), WER referansı ve önerilen kullanım senaryosunu gösterir. İlk seçim "base" önerilir.
- **US3**: Transkriptte "Katılımcı 1" ve "Mülakatçı" ayrımı (diarization) görmek istiyorum.
  - **Acceptance**: Whisper çıktısına ek diarization post-process (whisper.cpp `--diarize` veya pyannote) uygulanır; her `TranscriptLine`'a opsiyonel `speakerId` eklenir; UI'da her konuşmacı ayrı renkle gösterilir.
- **US4**: Transkriptin belirli bir cümlesine tıklayınca ses o noktadan çalsın (mevcut `jumpTo`) — ama aynı anda 10 dosyayı sıraya koyabileyim.
  - **Acceptance**: Yeni `TranscriptionQueuePanel` çoklu dosya eklemeyi, paralelliği (CPU core sayısına göre), iptali ve hata durumunda yeniden denemeyi destekler.
- **US5**: Uzun süren bir transkripsiyonu iptal edip kısmi sonucu kaydedebileyim.
  - **Acceptance**: "İptal" butonu sidecar process'i `kill` eder; üretilen segmentler kaydedilir; `transcriptStatus: "partial"` işaretlenir.
- **US6**: Hız gereken durumlarda bulut Whisper kullanabileyim ama varsayılan yerel olsun.
  - **Acceptance**: Ayarlarda provider toggle'ı: `local` (varsayılan) | `cloud` (OpenAI BYOK) | `ask`.

### 🏗️ Teknik Mimari

**Veri Modeli**:

```typescript
export interface TranscriptLine {
  id: string;
  start: number;          // saniye
  end: number;
  text: string;
  speakerId?: string;     // "interviewer" | "participant_1" | ...
  confidence?: number;    // 0-1 (avg_logprob'dan türetilir)
}

// Document tipine eklenen alanlar
export interface Document {
  transcript?: TranscriptLine[];
  transcriptStatus?: "none" | "processing" | "partial" | "complete" | "error";
  transcriptMeta?: {
    provider: "local-whisper" | "cloud-whisper" | "manual-import";
    model: string;
    language?: string;
    processedAt: number;
    durationSec: number;
    diarized: boolean;
  };
}

export interface WhisperModel {
  id: "tiny" | "base" | "small" | "medium" | "large";
  sizeMb: number;
  ramMb: number;
  speedX: number;         // realtime factor
  werPercent: number;
  languages: "en-only" | "multilingual";
  installed: boolean;
  installedPath?: string;
  recommendedFor: string;
}
```

**Tauri/Rust Katmanı**:
- **Yeni plugin**: `tauri-plugin-shell = "2"` (sidecar yönetimi).
- **Sidecar binary'leri** (`src-tauri/binaries/`): macOS Intel (`whisper-x86_64-apple-darwin`), Apple Silicon (`whisper-aarch64-apple-darwin`, Metal), Windows (`whisper-x86_64-pc-windows-msvc.exe`), Linux. `bundle.externalBin` ile paketlenir.
- **Rust komutları** (`src-tauri/src/whisper.rs`):

```rust
#[tauri::command]
async fn whisper_transcribe(
    app: AppHandle,
    media_path: String,
    model_path: String,
    language: Option<String>,   // None = auto-detect
    diarize: bool,
    job_id: String,
) -> Result<(), String>;

#[tauri::command]
async fn whisper_cancel(job_id: String) -> Result<(), String>;

#[tauri::command]
async fn whisper_download_model(app: AppHandle, model_id: String, dest_dir: String) -> Result<String, String>;

#[tauri::command]
fn whisper_list_models(models_dir: String) -> Result<Vec<WhisperModelRust>, String>;

#[tauri::command]
async fn whisper_health_check() -> Result<WhisperHealth, String>;
```

Sidecar stdout formatı JSONL: `{"type":"segment","start":12.34,"end":15.67,"text":"...","speaker":"spk0","avg_logprob":-0.32}` veya `{"type":"progress","percent":45.2,"elapsed":12.4}`. Rust tarafı `tokio::process::Command` + `BufReader` ile okur, `app.emit("whisper://<job_id>", payload)` ile frontend'e iletir. `media_path` canonicalize edilir ve uzantı allowlist'inden (mp3, wav, m4a, mp4, mov, webm, ogg, flac) geçirilir.

**Frontend Modülleri**:
```
src/
├── services/
│   ├── transcriptionService.ts        # MEVCUT — refactor: provider katmanı
│   └── localWhisperService.ts         # YENİ — Tauri komut sarmalayıcı
├── store/
│   └── transcription.store.ts         # YENİ
├── components/
│   └── transcription/
│       ├── TranscriptionQueuePanel.tsx
│       ├── WhisperModelPicker.tsx
│       ├── TranscriptionProgress.tsx
│       └── SpeakerBadge.tsx
└── lib/
    └── whisperEvents.ts               # typed event listener hook'ları
```

**Cargo bağımlılıkları**: `tauri-plugin-shell = "2"`, `tokio = { version = "1", features = ["process", "io-util"] }`.

**Zustand Store**:

```typescript
interface TranscriptionStore {
  models: WhisperModel[];
  activeModelId: WhisperModel["id"];
  modelsDir: string;
  provider: "local" | "cloud" | "ask";
  defaultLanguage: "auto" | Language;
  enableDiarization: boolean;
  jobs: TranscriptionJob[];
  enqueueJob: (documentId: ID) => void;
  cancelJob: (jobId: string) => Promise<void>;
  clearCompleted: () => void;
}

interface TranscriptionJob {
  id: string;
  documentId: ID;
  documentName: string;
  status: "queued" | "downloading-model" | "processing" | "done" | "error" | "cancelled";
  progress: number;            // 0-100
  error?: string;
  startedAt?: number;
  completedAt?: number;
  segmentsWritten: number;
}
```

Persist: `activeModelId`, `provider`, `defaultLanguage`, `enableDiarization` (pattern `settings.store.ts:175-179`'daki `partialize`).

### 🎨 UI/UX Tasarımı

```
┌─────────────────────────────────────────────────────────────────────┐
│ MediaWorkspace                                          [⋮ More]    │
├──────────────────────────────────┬──────────────────────────────────┤
│                                  │ TRANSCRIPT                       │
│         [Video/Audio Player]     │ ┌──────────────────────────────┐ │
│                                  │ │ ▶ Transcribe ▼               │ │
│                                  │ │   ● Local Whisper   [offline]│ │
│                                  │ │   ○ Cloud (OpenAI BYOK)      │ │
│                                  │ │   ○ Import SRT/VTT           │ │
│                                  │ └──────────────────────────────┘ │
│  ▶ 02:31 ━━━━━━━━━━━━━━━━━━━━━  │ ┌─ Model: base (75MB) ────────┐ │
│                                  │ │ [Interviewer] 02:14          │ │
│                                  │ │  So, tell me about your first│ │
│                                  │ │ [Participant 1] 02:21        │ │
│                                  │ │  It was overwhelming...   ↘  │ │
│                                  │ └──────────────────────────────┘ │
└──────────────────────────────────┴──────────────────────────────────┘
```

**Batch Queue Panel**:
```
┌─ TRANSCRIPTION QUEUE ─────────────────────────────────┐
│ ● interview_01.mp4          ▓▓▓▓▓▓░░░░ 58%  [Cancel]   │
│   base model · 12 segments written · 02:14 elapsed     │
│ ○ focus_group_02.wav        Queued                     │
│ ✓ pilot_interview.mp4       Done · 247 segments        │
│ [＋ Add files]   [Clear completed]   [Concurrency: 1]  │
└────────────────────────────────────────────────────────┘
```

**Privacy rozeti**: Local provider seçildiğinde `🔒 100% on-device — audio never leaves your computer`.

### 📅 Uygulama Aşamaları

**Faz 1 (MVP)** — ~8 gün:
- `tauri-plugin-shell` + 4 platform için whisper.cpp binary derleme scriptleri (CI).
- `whisper_transcribe` / `whisper_cancel` / `whisper_health_check` Rust komutları.
- `localWhisperService.ts` + event listener hook.
- `MediaWorkspace`'e "Local Whisper" butonu (sadece `tiny` ve `base`).
- İlerleme çubuğu + cancel.
- `transcription.store.ts`; sıralı (concurrency=1) iş kuyruğu.

**Faz 2 (Geliştirme)** — ~6 gün:
- Model indirme yöneticisi + HuggingFace mirror.
- Tüm model boyutları + Apple Silicon Metal hızlandırması.
- Diarization + `confidence` skoru.
- Batch queue paneli; IndexedDB persist.

**Faz 3 (İyileştirme)** — ~4 gün:
- Multi-language auto-detection; transcript editor (audit log); SRT/VTT export.
- "Re-transcribe with bigger model"; WASM/transformers.js yedek yolu.

### 🔗 Bağımlılıklar
- `MediaWorkspace.tsx`: "Whisper AI" butonu `TranscriptionMenu` ile değiştirilir.
- `settings.store.ts`: yeni `transcriptionProvider` alanı.
- `project.store.ts`: transcript güncellendiğinde `auditLog`'a `TRANSCRIBE_DOCUMENT` eklenir.
- IndexedDB (`src/lib/db.ts`): upgrade hook'ta `transcript` array'leri için index. ⚠️ **Ayrı bump YAPMA** — koordineli tek migration'a dahil et (bkz. üstteki DB_VERSION notu; mevcut sürüm 1).
- **Paylaşılan**: `transcription.store.ts`, `localAi.store.ts` (Özellik 3) ve `localModelHealth.ts` health-check runner'ını paylaşır.

### 🧪 Test Stratejisi
- **Unit**: `parseSubtitleFile` (mevcut) + `normalizeWhisperOutput`; `transcription.store.ts` reducer'ları; mock Tauri `invoke`+`listen`.
- **Integration**: 30 sn `sample-en.wav` + `sample-tr.m4a` (Common Voice, açık lisanslı); sidecar gerçekten çalışır; süreler monoton artan; cancel testi.
- **E2E/CI**: GitHub Actions matrix (windows, macos-13/14, ubuntu); WER < %15 (base, EN).

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltma |
|------|------|---------|
| Sidecar paketleme (kod imzalama, notarization) | Yüksek | macOS framework gömme; Windows code signing; CI matrix. Faz 1'de yalnız x86_64+aarch64 macOS + x86_64 Windows. |
| App bundle şişmesi | Orta | Modeller app'e gömülmez — ilk kullanımda indirilir. |
| Uzun dosyalarda crash | Orta | Her 50 segmentte IndexedDB'ye checkpoint; resume. |
| Diarization kalitesi | Orta | Faz 1'de kapalı varsayılan, Faz 2'de opsiyonel (beta). |
| HuggingFace indirme offline ethos'una ters | Düşük | Model bir kez indirilir, app data'da kalıcı. |

### 📊 Başarı Metrikleri
- İlk transkripsiyon başarı oranı ≥ %95.
- WER ≤ %18 (base, EN, temiz ses).
- Hız ≥ 2xRT (Apple Silicon M1, base).
- Local provider seçim oranı (anonim telemetri) ≥ %70.

---

## 3. Yerel LLM Desteği (Ollama / llama.cpp)

### 🎯 Amaç ve Değer Önerisi

QualityOpen'un mevcut AI sistemi (`src/lib/ai.ts`) OpenAI/Anthropic/Gemini'ye **BYOK** modelinde bağlıdır — yani örtük olarak internet, API hesabı, ödeme ve verinin üçüncü taraf sunucuya iletilmesi. Bu, **"100% offline by default"** ethos'una doğrudan ters düşer.

Bu özellik, mevcut BYOK sistemini **yerel LLM'leri de kapsayacak şekilde genişletir**: kullanıcı bilgisayarında [Ollama](https://ollama.ai) (varsayılan, `localhost:11434`) veya llama.cpp server çalıştırır ve QualityOpen aynı `askAi()` arayüzüyle bu yerel modele erişir. Sonuç: **tematik kodlama, sentez, sohbet, özetleme** — tüm mevcut AI yetenekleri — internet olmadan, sıfır maliyetle, sıfır veri sızıntısıyla çalışır.

**Kim yararlanır**: KVKK/GDPR verileriyle çalışanlar, üniversite firewall arkasındaki araştırmacılar, düşük bütçeli doktora öğrencileri, saha kamplarındaki antropologlar. Bu özellik QualityOpen'u **gerçek anlamda rakiplerden ayrıştıran** yeteneklerin başında gelir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1**: Mevcut AI sohbetini Ollama'daki yerel model ile kullanmak.
  - **Acceptance**: Settings'te "Local LLM (Ollama)" provider'ı; `AiChatPanel.tsx:95`'teki `askAi()` çağrısı şeffaf şekilde Ollama'ya gider; yanıt streaming; `🔒 Running 100% on-device` rozeti.
- **US2**: Ollama'nın kurulu olup olmadığını ve hangi modellerin indirildiğini görmek.
  - **Acceptance**: Settings "Local AI Health" paneli: servis durumu, yüklü modeller (`GET /api/tags`), boyut, son kullanım.
- **US3**: Model-görev eşleştirmesi (`💡 Coding` Llama 3.1 8B, `📝 Summarization` Phi-3, `💬 Chat` Qwen 2.5).
- **US4**: Token token akış + istediğimde durdurma (AbortController + Ollama cancel).
- **US5**: Ollama kurulu değilse platforma göre kurulum rehberi (macOS Homebrew, Windows installer, Linux curl).
- **US6**: Tematik kodlama (`analyzeThematicCodes`) yerel model ile de çalışsın (model-specific system prompt + JSON repair + retry).

### 🏗️ Teknik Mimari

**Veri Modeli**:

```typescript
export type AiProviderType = "openai" | "anthropic" | "gemini" | "ollama" | "llamacpp";

export interface AiProvider {
  readonly type: AiProviderType;
  readonly isLocal: boolean;
  readonly displayName: string;
  complete(req: AiRequest): Promise<string>;
  stream(req: AiRequest, onToken: (chunk: string) => void, signal: AbortSignal): Promise<string>;
  healthCheck(): Promise<AiHealth>;
}

export interface AiRequest {
  messages: Message[];
  systemPrompt: string;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AiHealth {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  modelsAvailable?: string[];
  message?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  quantization: string;
  modifiedAt: string;
  capabilities: AiCapability[];
}

export type AiCapability = "chat" | "coding" | "summarization" | "synthesis" | "embedding";

// settings.store.ts genişletme
export type DefaultProvider = "auto" | "openai" | "anthropic" | "gemini" | "ollama" | "llamacpp";
```

**Tauri/Rust Katmanı**:

`native_http` SSRF allowlist'i `127.0.0.1`'i engellediği için yeni `local_http` komutu eklenir:

```rust
// src-tauri/src/local_http.rs — yalnızca loopback + bilinen AI portlarına izin verir
#[tauri::command]
async fn local_http(method: String, url: String, headers_json: String, body: String) -> Result<(u16, String), String> {
    let parsed = url::Url::parse(&url).map_err(|e| format!("invalid url: {e}"))?;
    let host = parsed.host_str().ok_or("no host")?;
    let is_loopback = matches!(host, "127.0.0.1" | "localhost" | "::1");
    if !is_loopback { return Err(format!("local_http: only loopback allowed — blocked {}", host)); }
    let port = parsed.port().unwrap_or(80);
    const ALLOWED_PORTS: &[u16] = &[11434, 8080, 1234, 7860]; // Ollama, llama.cpp, lmstudio
    if !ALLOWED_PORTS.contains(&port) { return Err(format!("local_http: port {} not in allowlist", port)); }
    // reqwest ile istek...
}
```

Streaming için `local_http_stream` komutu — NDJSON satırlarını `app.emit("local-stream://<req_id>", chunk)` ile frontend'e iletir. Sağlık kontrolü: `local_ai_health(provider, base_url)`. **Ollama sidecar'ı YOK** — kullanıcı kendi kurar; app bundle küçük kalır.

**Frontend Modülleri**:
```
src/
├── lib/
│   ├── ai.ts                          # MEVCUT — refactor: provider registry'e delege
│   ├── ai/
│   │   ├── provider.ts                # AiProvider interface
│   │   ├── openaiProvider.ts, anthropicProvider.ts, geminiProvider.ts
│   │   ├── ollamaProvider.ts          # local_http + local_http_stream
│   │   ├── llamacppProvider.ts
│   │   └── providerRegistry.ts        # getActiveProvider() factory
│   └── localAi.ts                     # Tauri sarmalayıcı + event hooks
├── store/
│   ├── settings.store.ts              # genişletilir
│   └── localAi.store.ts              # YENİ
└── components/
    ├── settings/LocalAiPanel.tsx, ProviderSelector.tsx
    └── common/PrivacyBadge.tsx        # Özellik 1, 7 ile PAYLAŞILIR
```

**Kritik refactor** (`src/lib/ai.ts`):

```typescript
export async function askAi(
  key: string | null,           // artık nullable — local için null
  messages: Message[],
  systemPrompt: string,
  retryCount = 0
): Promise<string> {
  const provider = await resolveProvider(key);
  return provider.complete({ messages, systemPrompt });
}
```

Tüm mevcut çağrı noktaları aynı imzayı korur — sadece internal routing değişir. (⚠️ Not: `AiChatPanel.tsx` **zaten** `useSettingsStore().getActiveKey()` + OS keychain kullanıyor; eski taslaktaki `localStorage.getItem("qo_openai_key")` düzeltme maddesi **artık geçersizdir**.)

### 🎨 UI/UX Tasarımı

```
┌─ AI PROVIDER ────────────────────────────────────────────┐
│   ◉ Cloud (BYOK)         [configure keys →]              │
│   ◉ Local (On-Device)    🔒 100% offline                  │
│     ┌─ Ollama ─────────────────────────────────────┐     │
│     │ ● Running · 127.0.0.1:11434 · 23ms           │     │
│     │ Active model: llama3.1:8b  ▼                  │     │
│     │   ├ llama3.1:8b      💬 💡 📝    4.9 GB  ✓    │     │
│     │   ├ phi-3:mini       💬 📝       2.3 GB       │     │
│     │   ├ qwen2.5:7b       💬 💡       4.7 GB       │     │
│     │   └ nomic-embed-text 📊 embed    274 MB       │     │
│     │ [Pull new model…]   [Refresh]   [Setup guide] │     │
│     └───────────────────────────────────────────────┘     │
│   ○ llama.cpp server  (advanced)                         │
└──────────────────────────────────────────────────────────┘
```

### 📅 Uygulama Aşamaları

**Faz 1 (MVP)** — ~7 gün: `local_http` + `local_http_stream` Rust komutları; `AiProvider` interface + 3 cloud provider refactor; `OllamaProvider`; `localAi.store.ts` + health polling; Settings paneli; `AiChatPanel` streaming + stop; `PrivacyBadge`.
**Faz 2** — ~5 gün: Model yönetimi (`/api/pull`, `/api/delete`); `analyzeThematicCodes` JSON stabilize (prompt + retry); task önerici; llama.cpp provider; maliyet göstergesi.
**Faz 3** — ~3 gün: Context window yönetimi; benchmark widget; A/B model karşılaştırma; batch AI kuyruğu.

### 🧪 Test Stratejisi
- **Unit**: her provider mock `local_http`/`native_http` ile; `resolveProvider` factory; JSON mode retry.
- **Integration**: CI'da `docker run ollama/ollama` + `ollama pull tinyllama`; gerçek küçük model streaming testi; health kill→restart.
- **Manuel E2E**: Llama 3.1 8B ile tematik kodlama geçerli JSON üretiyor mu.

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltma |
|------|------|---------|
| Yerel modellerde JSON kararsız | Yüksek | Strict system prompt + `jsonrepair` + 2 retry + regex fallback. Disclaimer. |
| Yetersiz donanım (8GB RAM) | Orta | Hardware check; `tinyllama`/`phi-3-mini` önerisi. |
| Ollama daemon down | Orta | Açılışta health check + kurulum rehberi + "Start Ollama" kısayolu. |
| CSP/permissions | Düşük | Tauri Rust komutu kullanıldığı için CSP etkilenmez. |
| Streaming abort temiz değil | Orta | Rust tarafında reqwest request drop → Ollama bağlantıyı kapatır. |

### 📊 Başarı Metrikleri
- Provider switch sonrası ilk sohbet başarı ≥ %98.
- Streaming ilk token ≤ 1.5 sn (Llama 3.1 8B, M1).
- JSON mode başarısı ≥ %85 (2 deneme sonrası).
- AI kullanıcılarının ≥ %40'ı local provider seçer.
- App bundle boyutu artmamalı (Ollama ayrı kurulum).

---

## 7. Semantik Arama (Yerel Embeddings)

### 🎯 Amaç ve Değer Önerisi

Kalitatif analiz ilerledikçe en büyük zorluk **"şuna benzer başka segment var mı?"** sorusudur. Bir araştırmacı 50 mülakat kodladıktan sonra "güçsüzlük hissi" temalı yeni segment bulduğunda, geçmişte farklı kelimelerle kodladığı benzer anlamlı segmentleri hatırlaması neredeyse imkânsızdır. Mevcut `searchQuery` tam-text arama yaptığı için "powerless" ile "impotent", "voiceless", "had no say" eşanlamlılarını yakalayamaz.

Semantik arama, her segmenti ve dokümanı yüksek boyutlu bir **vektöre** dönüştürür ve kosinüs benzerliğiyle ölçer. QualityOpen bunu **tamamen yerel** yapar: Ollama'nın `/api/embeddings` (nomic-embed-text) veya `@xenova/transformers` (WASM) ile vektör üretilir; **yerel SQLite + sqlite-vss** veya **HNSW** ile indekslenir.

**Kim yararlanır**: Meta-sentez yapanlar, uzun projelerde tutarlı kodlama yapmaya çalışanlar, "saturation" kanıtı toplayanlar (mevcut saturation radar'ı besler). Bu özellik QualityOpen'u **akıllı bir asistan** seviyesine taşır — araştırmacı unutmaz, sistem hatırlatır.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1**: Kodlama yaparken segmenti seçip "Benzer segmentleri bul".
  - **Acceptance**: `ContextCodeMenu`'ye "Find similar"; kosinüs benzerliği top-10, skor ve kaynak linkiyle.
- **US2**: Doğal dilde sorgu: "powerlessness in workplace".
  - **Acceptance**: `SemanticSearchBar` (Header/Command Palette); sonuçlar `🎯 92% · interview_03:14 · [Power, Agency]` citation ile.
- **US3**: Sonuçların neden döndüğünü anlamak.
  - **Acceptance**: Her sonuç için kaynak doküman + offset + "Jump to source" + kod rozetleri.
- **US4**: Yeni segment eklenince indeksin otomatik güncellenmesi.
  - **Acceptance**: `project.store.ts`'teki `addSegment` sonrası debounced hook; "Indexing 3 new segments…" göstergesi.
- **US5**: İnternet olmadan çalışma (varsayılan yerel).
- **US6**: 10.000+ segmentte arama < 200ms (HNSW).

### 🏗️ Teknik Mimari

**Veri Modeli**:

```typescript
export interface EmbeddingResult {
  vector: Float32Array;       // 384 (MiniLM) veya 768 (nomic)
  model: string;
  dimensions: number;
  generatedAt: number;
}

// Segment genişletmesi
export interface Segment {
  embeddingMeta?: { model: string; dimensions: number; generatedAt: number; vectorId: string };
}

export interface DocumentChunk {
  id: string;
  documentId: ID;
  projectId: ID;
  chunkIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  embeddingMeta?: { model: string; generatedAt: number; vectorId: string };
}

export interface SemanticSearchResult {
  type: "segment" | "document-chunk";
  id: string;
  documentId: ID;
  text: string;
  similarity: number;
  codes?: Code[];
  citation: { documentName: string; offset?: { start: number; end: number }; page?: number };
}
```

**Tauri/Rust Katmanı** — sqlite-vss önerilen (mevcut IndexedDB ile yan yana, kolay migration). Alternatif: `hnsw_rs` (pure Rust HNSW).

```rust
// src-tauri/src/vector_store.rs
#[tauri::command]
async fn vector_init(db_path: String) -> Result<(), String>;  // CREATE VIRTUAL TABLE ... USING vss0(vector(384))

#[tauri::command]
async fn vector_upsert(db_path: String, ids: Vec<String>, vectors: Vec<Vec<f32>>) -> Result<(), String>;

#[tauri::command]
async fn vector_search(db_path: String, query_vector: Vec<f32>, top_k: u32, filter_project_id: Option<String>) -> Result<Vec<VectorHit>, String>;

#[tauri::command]
async fn vector_delete(db_path: String, ids: Vec<String>) -> Result<(), String>;
```

Embedding üretimi: Ollama (`POST 127.0.0.1:11434/api/embeddings`) veya transformers.js (`pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')` — `tesseract.js` precedent'i var). Cargo: `rusqlite = { version = "0.31", features = ["bundled", "load_extension"] }`, `sqlite-vss` veya `hnsw_rs = "0.3"`.

**Frontend Modülleri**:
```
src/
├── lib/
│   ├── embeddings.ts, embeddings/{ollamaEmbedding,transformersEmbedding,openaiEmbedding,embeddingRegistry}.ts
│   └── vectorStore.ts
├── store/embeddings.store.ts
├── services/semanticSearch.ts
└── components/search/{SemanticSearchBar,SemanticResults,FindSimilarButton}.tsx
```

**Zustand Store**:

```typescript
interface EmbeddingsStore {
  activeModel: string;
  provider: "ollama" | "transformers-js" | "openai";
  indexStatus: { total: number; indexed: number; pending: number; status: "idle"|"indexing"|"ready"|"error"; lastError?: string };
  autoIndex: boolean;
  chunkSize: number;
  topK: number;
  indexProject: (projectId: ID) => Promise<void>;
  indexSegment: (segmentId: ID) => Promise<void>;  // incremental
  reindexAll: () => Promise<void>;
}
```

Incremental indexing hook (`project.store.ts` subscribe):

```typescript
useProjectStore.subscribe((s) => s.segments, (segments, prevSegments) => {
  if (!useEmbeddingsStore.getState().autoIndex) return;
  const newSegs = segments.filter(s => !prevSegments.includes(s) && !s.embeddingMeta);
  if (newSegs.length > 0) scheduleEmbeddingBatch(newSegs);
});
```

### 🎨 UI/UX Tasarımı

```
┌─────────────────────────────────────────────────────────────────────┐
│  QualityOpen     [🔍 Text] [🧠 Semantic ▼]   [⌘K]    [@user] [⚙]   │
│                  ┌─────────────────────────────────────────┐        │
│                  │ feeling powerless at work               │        │
│                  └─────────────────────────────────────────┘        │
│                  🔒 nomic-embed-text · 1,247 segments indexed       │
└─────────────────────────────────────────────────────────────────────┘

┌─ SEMANTIC SEARCH RESULTS · "feeling powerless at work" ─────┐
│ Query embedded in 84ms · 1,247 segments searched in 23ms    │
├──────────────────────────────────────────────────────────────┤
│ 🎯 94%  interview_07:14:23                                   │
│   "I felt like my voice didn't matter in those meetings..."  │
│   [Power] [Agency]                          → Open document  │
├──────────────────────────────────────────────────────────────┤
│ 🎯 89%  focus_group_02:08:41                                 │
│   "They made all the decisions without asking us..."         │
│   [Hierarchy]                               → Open document  │
└──────────────────────────────────────────────────────────────┘
```

"Find similar" segment context menü: `🧠 Find similar (12)`.

### 📅 Uygulama Aşamaları

**Faz 1 (MVP)** — ~7 gün: `EmbeddingProvider` abstraction + Ollama provider; `vector_store.rs` + sqlite-vss; `SemanticSearchBar` + `SemanticResults`; manual "Index project"; segment-only indeks.
**Faz 2** — ~6 gün: Incremental indexing hook; document chunk'ları; "Find similar" entegrasyonu; citation linkleri; transformers.js fallback (Ollama gerektirmeden).
**Faz 3** — ~4 gün: Hybrid search (semantic + BM25 fusion); filter'lar; "Saturation insight" beslemesi; reindex on model change.

### 🧪 Test Stratejisi
- **Unit**: kosinüs similarity (saf TS); `chunkDocument(doc, 512)`; provider mock'ları.
- **Integration**: 100 segmentlik demo + referans vektörler (snapshot); Ollama container CI; `vector_search` beklenen top-3.
- **Performans bench**: 10.000 sentetik segment index build < 60 sn; tek sorgu < 50 ms (sqlite-vss) / < 200 ms (transformers.js).
- **Semantik doğruluk**: 20 çift eşanlamlı cümle min %75 >0.7 kosinüs.

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltma |
|------|------|---------|
| sqlite-vss Windows derlemesi karmaşık | Yüksek | Faz 1'de `hnsw_rs` (pure Rust) önceliklendir; sqlite-vss Faz 2'de opsiyonel. |
| Embedding yavaş (10K × 100ms = 16dk) | Orta | Batch embedding; background thread; CPU throttle. |
| Vektör boyutu (10K = 15MB, 100K = 150MB) | Orta | sqlite-vss disk-based; Faz 3'te 8-bit kuantizasyon. |
| İlk indeks uzun | Orta | Progress + tahmin + pause/resume. |
| Model değişiminde geçersiz indeks | Yüksek | Her segmentte `embeddingMeta.model` saklanır; değişimde zorunlu "Reindex?" uyarısı. |

### 📊 Başarı Metrikleri
- İndeksleme hızı ≥ 100 segment/dakika (Ollama nomic, M1).
- Arama gecikmesi P95 < 200 ms (10K segment).
- Semantik precision@10 ≥ %70.
- Günlük aktif kullanıcıların ≥ %30'u en az bir semantik arama yapar.
- Saturation radar doğruluğu ≥ %80 (semantik besleme sonrası).

---

# Bölüm 2 — Veri Modeli (Özellik 5, 6, 2)

---

## 5. Vakalar ve Öznitelik Sistemi (Cases & Attributes)

### 🎯 Amaç ve Değer Önerisi

Niteliksel analizde "vaka" (case) analizin birimidir: katılımcı, saha, kurum veya olay. QualityOpen şu anda belge düzeyinde gevşek bir `metadata` torbası sunuyor; bu, "P05 nolu katılımcının tüm görüşmelerini ve kodlamalarını bir araya getirip demografik gruplar halinde karşılaştırmak" gibi temel QDA iş akışlarını desteklemiyor. NVivo'nun "Cases", ATLAS.ti'nin "Document Groups / Attributes" ve MAXQDA'nın "Document Variables" özellikleri pazar standardıdır; bu özellik o standardın **offline-first, açık ve JARS-uyumlu** karşılığıdır.

Değer önerisi üç eksenlidir: (1) **Analiz birimini soyutla** — vaka seviyesinde anlamlı sorgu ve görselleştirme; (2) **Yapısal demografi** — tipli öznitelikler (sayı/tarih/kategorik/boolean) sayesinde kesin karşılaştırma; (3) **Bilimsel şeffaflık** — vaka tabanlı analizler audit trail'e yazılır.

Tasarım, mevcut `Document.metadata` torbasını bozmadan üstüne inşa edilir; eski projeler çalışmaya devam eder.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1 — Vaka + tipli öznitelik tanımlama**: `string | number | date | categorical | boolean`; kategorik option listesi düzenlenebilir; şema değişiklikleri audit'e yazılır.
- **US2 — Belge/segment → vaka bağlama (N:M)**: Segment için context menüden, belge için özellikler panelinden; bir belge birden çok vaka (grup görüşmesi) içerebilir.
- **US3 — Vaka × Kod cross-tabulation**: Her vaka için kod sıklığı (count) + isteğe bağlı yoğunluk. 10.000 segmentte ≤ 500ms (cache'li).
- **US4 — Grup karşılaştırması**: Kategorik özniteliğe göre (Gender=Male vs Female) kod dağılımı; frekans + yüzde + ısı haritası; ki-kare opsiyonel.
- **US5 — Uygulama geneli vaka filtresi**: Aktif filtre tüm analytics/export'a yansır; üst bar rozeti; deep-link serialize.

### 🏗️ Teknik Mimari

**Veri Modeli**:

```typescript
export type CaseKind = "participant" | "site" | "organization" | "event" | "custom";
export type AttributeType = "string" | "number" | "date" | "categorical" | "boolean";

export interface CaseAttributeDefinition {
  id: ID; projectId: ID; name: string; key: string; type: AttributeType;
  options?: string[]; dateFormat?: string; unit?: string;
  required: boolean; order: number; version: number;
  createdAt: number; updatedAt: number; deletedAt?: number;
}

export interface CaseAttributeValue {
  [attributeKey: string]: string | number | boolean | null;
}

export interface Case {
  id: ID; projectId: ID; name: string; kind: CaseKind;
  description?: string; color?: string; attributes: CaseAttributeValue;
  createdAt: number; updatedAt: number; deletedAt?: number;
}

export type CaseLinkTargetType = "document" | "segment";

export interface CaseLink {
  id: ID; projectId: ID; caseId: ID;
  targetType: CaseLinkTargetType; targetId: ID;
  note?: string; createdBy?: ID; createdAt: number;
}

export interface CaseCodeMatrixCache {
  projectId: ID;
  contentHash: string; computedAt: number;
  rows: Record<ID, Record<ID, { count: number; intensity: number }>>;
  caseTotals: Record<ID, number>;
}
```

**IndexedDB Şema Genişletmesi** (`DB_VERSION` 1 → 2): `cases`, `caseAttributes`, `caseLinks` (indekslerle: `byCase`, `byTarget`, `byProject`), `caseMatrixCache`.

**İndeksleme Stratejisi** (cross-tab `O(cases × segments × codes)`):
1. `segmentToCases`/`caseToSegments` haritaları memoize.
2. `segmentToCodes` ters indeksi memoize.
3. Matris `O(cases × codes)`; `CaseCodeMatrixCache`'e yazılır.
4. `contentHash = ${projectRev}-${segmentsRev}-${casesRev}-${caseLinksRev}-${codesRev}`.

```typescript
export function buildCaseCodeMatrix(opts: {
  cases: Case[]; codes: Code[]; segments: Segment[];
  caseLinks: CaseLink[]; includeChildCodes: boolean;
}): CaseCodeMatrixCache["rows"];
```

**Frontend Modülleri**: `src/services/{caseMatrix,caseFilter,attributeValidation}.ts`, `src/store/cases.store.ts`, `src/components/cases/{CaseManager,CaseProfilePage,CaseCodeMatrix,GroupComparisonReport,AttributeSchemaEditor,CaseLinkPicker}.tsx`.

`useCasesStore` paralel yaşar (persist `qo-cases-data`). `useAppStore`'a `activeCaseFilter: ID[] | null` eklenir.

**Audit Trail**: `CREATE_CASE`, `UPDATE_CASE`, `DELETE_CASE`, `ADD_ATTRIBUTE`, `UPDATE_ATTRIBUTE`, `DELETE_ATTRIBUTE`, `CASE_LINK`, `CASE_UNLINK`.

### 🎨 UI/UX Tasarımı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QualityOpen  [Proje: Gençlik Saha Çalışması]      [Vaka Filtresi: 5/12 ▼]  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ ▾ Vakalar    │  [+ Yeni Vaka] [Şema Düzenle] [Cross-Tab] [Grup]             │
│   • P01-Ayşe │  Ad          Yaş  Cinsiyet  Rol        Bağlı Belge           │
│   • P02-Meh  │  P01 — Ayşe  24   F         Öğrenci    3 belge, 47 sg        │
│   ▾ Kodlar   │  ...                                                           │
│              │  Cross-Tab (Vaka × Kod)                       [↻ Yenile]      │
│              │         Power  Resistance  Hope  Fear                          │
│              │  P01      8 ●●●    3 ●        5 ●●     0                       │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### 📅 Uygulama Aşamaları

**Faz 1 (MVP)** — ~8–10 gün: tipler + IndexedDB v2 migration; vaka CRUD + şema editörü (`string`/`number`/`categorical`); belge→vaka bağlama; cross-tab (cache yok).
**Faz 2** — ~7–9 gün: `contentHash` cache + incremental; segment→vaka; grup karşılaştırma; `date`/`boolean` öznitelikler.
**Faz 3** — ~6–8 gün: global `activeCaseFilter` tüm analytics'e; deep-link serialize; `Document.metadata` → vaka migrasyon sihirbazı; QDPX case export.

### 🧪 Test Stratejisi
- Golden dataset (5 vaka, 4 kod, 60 segment) elle hesaplanmış cross-tab assertion'ları.
- Tipli öznitelik doğrulama (geçerli/geçersiz).
- Cache tutarlılığı; performans (10K segment + 50 vaka + 30 kod < 500ms).
- Migrasyon idempotency.

### ⚠️ Riskler ve Azaltıcı Önlemler
- **Performans**: memoize indeksler + cache + Web Worker (Faz 3).
- **Şema drift**: soft delete + "tanımsız öznitelik" rozeti.
- **Çoklu vaka belgeleri**: Faz 1'de 1:N varsayılan, N:M Faz 2'de.
- **Geriye dönük uyumluluk**: `Document.metadata`'ya dokunulmaz; migrasyon opsiyonel.

### ⏱️ Efor: **~21–27 iş günü (~4–5 hafta tek geliştirici)**.

### 📊 Başarı Metrikleri
- Vaka oluşturma oranı 4 haftada ≥ %40.
- Cross-tab 95. persantilde < 500ms.
- Grup karşılaştırma kullanımı ≥ %25.
- Migrasyon hata oranı < %1.

---

## 6. Gelişmiş Sorgu Oluşturucu (Advanced Query Builder)

### 🎯 Amaç ve Değer Önerisi

QDA'da araştırmacının en güçlü silahı "hangileridir?" sorusudur: *Hangi alıntılar hem "Güç" hem "Direniş" kodlanmış ama "Umutsuzluk" ile değil; ve kadın katılımcılarda?* Mevcut `activeCodeFilters + filterLogic (AND|OR)` iki-kodlu en basit durum için yeterli; ancak Boolean (NOT), yakınlık (NEAR/WITHIN), küme işlemleri ve regex eksik.

Bu özellik NVivo "Queries" ve ATLAS.ti "Query Tool" karşılığıdır; **görsel AST tabanlı** kurulum + **doğal-dil önizleme** ile kullanıcı dostu. Sorgular kaydedilip yeniden kullanılabilir; bu da metodolojik tekrarlanabilirlik (JARS) için kritiktir.

Tasarım, mevcut `activeCodeFilters`/`filterLogic` mekanizmasını **geriye dönük olarak kapsar**: basit iki-kodlu filtre `and([code(A), code(B)])` AST node'u olarak temsil edilir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1 — Görsel sorgu oluşturma**: AND/OR/NOT, parantezleme, NEAR/WITHIN (kelime/cümle), kesişim/birleşim/fark.
- **US2 — Doğal dil önizleme**: "[Güç] VE [Direniş], DEĞİL [Umutsuzluk], cinsiyet=Kadın vakalarında" — canlı güncellenir.
- **US3 — Sonuç listesi**: bağlam + kaynak belgeye jump; pagination; CSV/JSON export.
- **US4 — Kaydedilmiş sorgu kütüphanesi**: isim/açıklama; yeniden çalıştırma; silme audit'e.
- **US5 — Sorgudan görselleştirme**: "Sonuç → Matris" / "Sonuç → Ağ".

### 🏗️ Teknik Mimari

**Sorgu AST**:

```typescript
export type ProximityUnit = "word" | "sentence" | "char";

export type QueryLeaf =
  | { kind: "code"; codeId: ID; includeChildren: boolean }
  | { kind: "case"; caseId: ID }
  | { kind: "caseGroup"; attributeKey: string; value: string | number | boolean }
  | { kind: "docType"; docType: string }
  | { kind: "docTag"; tag: string }
  | { kind: "dateRange"; from: number; to: number; field: "createdAt" | "updatedAt" }
  | { kind: "text"; pattern: string; flags: string; scope: "segmentText" | "documentContent" }
  | { kind: "memo"; contains: string; scope: "segment" | "standalone" }
  | { kind: "attribute"; attributeKey: string; type: AttributeType; operator: "eq"|"ne"|"gt"|"gte"|"lt"|"lte"|"between"|"in"|"contains"; value: string|number|boolean|Array<string|number> }
  | { kind: "all" };

export type QueryCombinator =
  | { kind: "and"|"or"; children: QueryNode[] }
  | { kind: "not"; child: QueryNode }
  | { kind: "intersect"|"union"|"difference"|"xor"; left: QueryNode; right: QueryNode };

export interface QueryProximity {
  kind: "near" | "within"; left: QueryNode; right: QueryNode;
  window: number; unit: ProximityUnit; ordered?: boolean;
}

export type QueryNode = QueryLeaf | QueryCombinator | QueryProximity;

export interface SavedQuery {
  id: ID; projectId: ID; name: string; description?: string;
  ast: QueryNode; lastResultCount?: number;
  createdBy?: ID; createdAt: number; updatedAt: number;
}
```

**Evaluator** (`src/services/query/evaluator.ts`): her node tipi için `Set<ID>` döndürür. Yakınlık için `evaluateProximity` aynı belgede mesafe ölçer (ordered/unordered). Doğal dil önizleme `src/services/query/describe.ts`.

**Performans**: `and`'de cost-based short-circuit (en küçük çocuk ilk); `WeakMap<QueryNode, Set<ID>>` memoize; yakınlıkta sweep-line; Web Worker (>10K segment).

**Frontend Modülleri**: `src/services/query/{evaluator,describe,serializer,proximity}.ts`, `src/store/query.store.ts`, `src/components/query/{QueryBuilder,QueryNodeCard,QueryResultsPanel,QueryPreviewBar,SavedQueryLibrary}.tsx`.

**Audit Trail**: `SAVE_QUERY`, `DELETE_QUERY`, `RUN_QUERY` (details'a AST JSON).

### 🎨 UI/UX Tasarımı

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sorgu Oluşturucu                                       [Çalıştır ▶] [Kaydet]│
├──────────────────────────────────────────────────────────────────────────────┤
│ Önizleme: "[Güç] VE [Direniş], DEĞİL [Umutsuzluk], cinsiyet=Kadın vakalarda" │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─ VE ────────────────────────────────────────────────────────────────────┐  │
│ │ ┌─[Güç]─┐ ┌─[Direniş]─┐ ┌─DEĞİL──────┐  ┌─cinsiyet=Kadın vakalar──────┐ │  │
│ │ └───────┘ └───────────┘ └─[Umutsuz.]─┘  └─────────────────────────────┘ │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│ Sonuçlar (47 segment)              [Matris] [Ağ] [CSV] [JSON]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 📅 Uygulama Aşamaları

**Faz 1** — ~10–12 gün: AST tipleri + Boolean evaluator (code/case/docType/attribute yaprakları) + NL önizleme + sonuç paneli.
**Faz 2** — ~6–8 gün: `near`/`within` + `text` regex + `memo`; sweep-line yakınlık.
**Faz 3** — ~6–8 gün: SavedQuery kütüphanesi; sorgudan görselleştirme; Web Worker; deep-link serialization; F2 `coderFilter`.

### 🧪 Test Stratejisi
- Boolean golden test'leri (küçük bilinen set); yakınlık golden (Türkçe karakter normalize); NL önizleme her node için; büyük veri bench (10K + 7-dallı AST < 1sn); serializer round-trip.

### ⚠️ Riskler ve Azaltıcı Önlemler
- **Yakınlık performans**: sweep-line + partition + Web Worker.
- **Regex güvenliği**: 50ms zaman aşımı + catastrophic backtracking reddi.
- **Okunabilirlik kaybı**: NL önizleme + "sadeleştir" önerisi (`difference(a,b) ≡ and(a, not(b))`).
- **Geriye dönük uyumluluk**: eski `filterLogic`/`activeCodeFilters` AST'ye map'lenir.

### ⏱️ Efor: **~22–28 iş günü (~4–5 hafta tek geliştirici)**.

### 📊 Başarı Metrikleri
- En az bir kaydedilmiş sorgu oluşturma ≥ %35.
- Karmaşık (≥3 node) sorgu < 800ms.
- NL anlaşılırlık ≥ 4/5.
- Sorgu-temelli tekrarlanabilirlik kullanımı ≥ %15.

---

## 2. İnter-Kodlayıcı Güvenilirlik ve Çoklu Kodlayıcı İş Akışı (ICR & Multi-Coder)

### 🎯 Amaç ve Değer Önerisi

Nitel araştırmanın en büyük eleştiri noktası **öznellik**: iki kodlayıcı aynı metne baktığında aynı kodu mu atar? İnter-coder reliability (ICR) bu eleştiriye istatistiksel bir yanıt verir. Cohen'in Kappa'ı, Krippendorff'un Alpha'sı, Scott'un π'ı ve yüzde anlaşma standart metriklerdir — APA JARS-Qual bunları raporlamayı bekler. QualityOpen şu anda tek kodlayıcı varsayıyor (`Segment.codeIds`'te kimlik yok); bu da çoklu kodlayıcı destekli projelerde temel bir eksiklik.

Bu özellik NVivo "Coder Comparison", ATLAS.ti "Inter-Coder Agreement" ve MAXQDA "Intercoder Agreement" araçlarının açık-kaynak karşılığıdır. Üç yapı taşı: (1) **Çoklu kodlayıcı kimliği**; (2) **Güvenilirlik metrikleri** (klasik formüllerle); (3) **Mutabakat iş akışı**. Mevcut tek-kodlayıcı projeleri **bozmadan** gerçekleştirilir: mevcut `Segment.codeIds` "varsayılan kodlayıcı" (proje sahibi) kimliğiyle yeni `Coding` varlığına migrasyonlanır.

ICR metrikleri kodlamaya dair iddiaları doğrular; hesaplama şeffaftır (Cohen 1960; Krippendorff 2004; Scott 1955) ve sonuçlar audit trail ile izlenebilir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1 — Çoklu kodlayıcı kurulumu**: her kodlama eylemi kodlayıcı kimliği taşır; geriye dönük uyumlu (mevcut tek-kodlayıcı projeler bozulmaz).
- **US2 — Kodlayıcı katmanları**: "sadece Alice" / "sadece Bob" / "birleşik (consensus)" görünümleri; tüm UI'ya yansır (stripes, code tree count, analytics).
- **US3 — ICR metrikleri**: kod başına + genel Cohen's Kappa, Krippendorff's Alpha, yüzde anlaşma, Scott's π; klasik formüller; golden test'ler; kodlayıcı çifti başına kırılım.
- **US4 — Anlaşmazlık iş akışı**: ayrışan noktalar `open/discussing/resolved` durumlarıyla işaretlenir; tartışma; consensus kodlama audit'e yazılır.
- **US5 — Codebook + eğitim seti**: QDC XML/JSON export/import; "eğitim seti" işaretli belgeler; kalibrasyon.

### 🏗️ Teknik Mimari

**Veri Modeli**:

```typescript
export type CoderRole = "owner" | "collaborator" | "assistant";

export interface Coder {
  id: ID; projectId: ID; name: string; email?: string;
  color: string; role: CoderRole; globalUserId?: string;
  isDefault?: boolean; createdAt: number; updatedAt: number; deletedAt?: number;
}

export interface Coding {
  id: ID; segmentId: ID; projectId: ID; codeId: ID; coderId: ID;
  createdAt: number; layer: "individual" | "consensus";
  resolvedFrom?: ID; supersededBy?: ID; deletedAt?: number;
}

export type DisagreementStatus = "open" | "discussing" | "resolved" | "wont_fix";

export interface DisagreementFlag {
  id: ID; projectId: ID; segmentId: ID; codeId?: ID; coderIds: ID[];
  status: DisagreementStatus; thread: DisagreementNote[];
  decision?: { type: "keep"|"remove"|"recode"; finalCodeId?: ID; resolvedById: ID; resolvedAt: number; note?: string };
  createdAt: number; updatedAt: number;
}

export interface ICRPairResult {
  coderA: ID; coderB: ID;
  perCode: Record<ID, { observed: number; expected: number; kappa: number; scottsPi: number; percentAgreement: number; agreements: number; disagreements: number }>;
  overall: { observedAgreement: number; expectedAgreement: number; kappa: number; scottsPi: number; krippendorffAlpha: number; percentAgreement: number; totalUnits: number };
}

export interface ICRResult {
  projectId: ID; scope: { documentIds?: ID[]; isTrainingSet: boolean };
  contentHash: string; computedAt: number;
  pairs: ICRPairResult[];
  hotspots: Array<{ segmentId: ID; disagreementCount: number; codes: ID[] }>;
}
```

**ICR Formülleri** (birim = iki kodlayıcının segment sınırlarının birleşimiyle belirlenen alt-aralıklar):

- **Cohen's Kappa** (Cohen 1960): $\kappa = \frac{p_o - p_e}{1 - p_e}$; $p_e$ kodlayıcıların **ayrı** marjinal frekanslarından.
- **Scott's π** (Scott 1955): $p_e$ **birleşik** marjinal frekanslardan.
- **Krippendorff's Alpha** (Krippendorff 2004): $\alpha = 1 - \frac{D_o}{D_e}$; eksik veri + çok kodlayıcı destekli.

```typescript
export function cohensKappa(a: boolean[], b: boolean[]): { po: number; pe: number; kappa: number };
export function scottsPi(a: boolean[], b: boolean[]): number;
export function krippendorffAlpha(units: Array<Array<{ coderId: ID; value: 0|1 }>>, coders: [ID, ID]): number;
```

> Testlerde literatürdeki bilinen tablolar (Cohen 1960) ve Python `nltk.metrics.agreement` çıktısıyla golden karşılaştırma.

**Çoklu Kodlayıcı Migration** (`src/store/migration/codingsMigration.ts`): her proje için "varsayılan kodlayıcı" oluşturur; her `Segment.codeIds[]` için birer `Coding` üretir (coderId = default, layer = individual). `Segment.codeIds` korunur ve `codings`'ten türetilir — eski UI (`CodeAssignPanel`, `CodingStripes`) değişiklik gerektirmeden çalışır. Migration idempotent; opsiyonel bayrakla tetiklenir.

**Frontend Modülleri**: `src/services/icr/{metrics,units,compute,codebook}.ts`, `src/store/coders.store.ts`, `src/components/icr/{CoderManager,CoderLayerSwitcher,ICRReport,AgreementMatrix,DisagreementResolutionDialog,CodebookExporter,TrainingSetManager}.tsx`.

`useAppStore`'a `activeCoderLayer: "all" | "consensus" | ID` eklenir; tüm segment selector'ları bunu uygular.

**Audit Trail**: `APPLY_CODING`, `REMOVE_CODING` (details: `{codeId, coderId, layer}`); `Coding.deletedAt` soft delete → geçmişe dönük yeniden hesap her zaman yapılabilir. Consensus çözümleme hem `DisagreementFlag.decision` hem yeni `Coding` (layer=consensus) üretir.

### 🎨 UI/UX Tasarımı

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ QualityOpen   [Katman: ▼ Tümü / Alice / Bob / Consensus]    [ICR Raporu]    │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ ▾ Kodlayıcı  │  Genel Uyum (Alice × Bob)                                    │
│   ✓ Alice    │   Cohen's κ = 0.74   Krippendorff α = 0.71                  │
│   ✓ Bob      │   Scott's π = 0.73   % Anlaşma = 0.86                        │
│              │  Kod-bazlı: Güç 0.81 ✓İyi · Direniş 0.45 ⚠Geliştir · Umut 0.12 ✸Düşük│
│              │  Anlaşmazlık Sıcak Noktalar (3)                              │
│              │   ⚠ Belge-2 §14 · "Güç" — Alice:Var, Bob:Yok    [Çöz]       │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

**Anlaşmazlık çözümleme diyaloğu**: yan yana kodlayıcı görüşleri + `Tartış` + nihai karar (`Konsensüs`).

### 📅 Uygulama Aşamaları

**Faz 1** — ~12–14 gün: `Coder`, `Coding` + migration; `applyCoding`/`removeCoding` + eski `Segment.codeIds` senkron; katman seçici; Kappa + yüzde anlaşma.
**Faz 2** — ~10–12 gün: Scott's π, Krippendorff α (nominal); birim-kafesi; `DisagreementFlag` iş akışı + consensus layer; ICR cache.
**Faz 3** — ~7–9 gün: QDC/JSON codebook; eğitim seti + kalibrasyon; çok-kategorik Krippendorff α; Web Worker; Drive çoklu-kodlayıcı sync.

### 🧪 Test Stratejisi
- Golden ICR testleri (Cohen 1960, Neuendorf 2002 örnekleri) + Python `nltk` cross-check.
- Migration birim testi + idempotency.
- Layer doğruluğu; birim-kafesi (örtüşen/örtüşmeyen) golden fixture.
- Cache invalidation; performans (1.000 segment × 3 kodlayıcı < 2sn).

### ⚠️ Riskler ve Azaltıcı Önlemler
- **Performans**: Web Worker + cache + artımlı (yalnızca değişen kodlar).
- **Geriye dönük uyumluluk** (en yüksek risk): `Segment.codeIds` canlı, migration opsiyonel + idempotent, eski çağrı noktaları forward.
- **Birim tanımı belirsizliği**: ayarlarda "birim modeli" seçimi (segment-birleşimi varsayılan).
- **Drive senkronizasyon çakışması**: `last-write-wins` + otomatik `DisagreementFlag`.
- **İstatistiksel yanlış yorum**: Landis-Koch etiketleri (κ ≥ 0.81 "mükemmel") + "codebook'u gözden geçir" önerisi.
- **Eksik veri**: Krippendorff α doğal ele alır; Cohen's κ'de politika seçimi.

### ⏱️ Efor: **~29–35 iş günü (~6–7 hafta tek geliştirici)**.

### 📊 Başarı Metrikleri
- Çoklu-kodlayıcı projelerinde ortalama Cohen's κ ≥ 0.70 (kalibrasyon sonrası).
- ICR raporu kullanımı ≥ %80.
- Migration hatasız ≥ %99.
- ICR hesap 95. persantilde < 2 sn.
- JARS-Qual güvenilirlik maddesi otomatik dolum ≥ %90.

---

# Bölüm 3 — Gizlilik (Özellik 4)

---

## 4. PII Tespiti ve Anonimleştirme (PII Detection & Anonymization)

### 🎯 Amaç ve Değer Önerisi

Kalitatif araştırmaların en temel etik yükümlülüğü katılımcıların kimliğinin korunmasıdır. Çoğu QDA aracı bu sorunu araştırmacının inisiyatifine bırakır; sonuçta yayınlanan makalelerde, alıntılanan sözlerde ve dışa aktarılan kodlama raporlarında istemeden T.C. kimlik numaraları, e-posta adresleri, kişi adları sızdırılır. QualityOpen, PII korumasını **birinci sınıf, varsayılan açık** bir özellik olarak sunar: belge içe aktarımı sırasında otomatik tarama, hibrit (regex + yerel NER) tespit, araştırmacı onaylı anonimleştirme ve tüm aksiyonların değiştirilemez audit trail kaydı.

GDPR Madde 25 ("data protection by design and by default") ve KVKK özel nitelikli kişisel verilerin (kimlik numarası, sağlık) **tasarım aşamasında** korunmasını zorunlu kılar. Bu özellik yalnızca bir araç değil, **etik kurul (IRB) başvurusuna eklenebilir resmi bir denetim kanıtı** üretir: hangi belgede hangi PII tespit edildi, hangi yöntemle anonimleştirildi, kim tarafından ne zaman onaylandı — hepsi kriptografik olarak imzalı bir audit trail halinde dışa aktarılabilir.

**Kritik gizlilik avantajı**: **tespit ettiğimiz PII hiçbir zaman cihazı terk etmez**. Hiçbir bulut PII servisi, hiçbir üçüncü taraf NER API'si, hiçbir telemetri. NER modeli tamamen yerel (transformers.js veya yerel Ollama), orijinal PII değerleri AES-256-GCM ile cihaza bağlı anahtarla şifrelenir. Bu, QualityOpen'un GDPR/KVKK yükümlülüklerini **mühendislik düzeyinde** karşıladığı anlamına gelir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri

- **US1 — Otomatik içe aktarım taraması**: 10K kelimelik belge < 60 sn; Web Worker; canlı highlight; "Taramayı atla" uyarı + audit log.
- **US2 — Hibrit tespit**: formatlı PII regex + checksum (TCKN 11-basamak, IBAN MOD-97, kredi kartı Luhn); belirsiz PII (kişi/org/lokasyon) yerel NER + confidence; model seçilebilir (transformers.js / Ollama / devre dışı).
- **US3 — Beş anonimleştirme aksiyonu**: `redact` ([REDACTED]), `pseudonymize` (Participant_NN), `mask` (kısmi), `replace` ([CATEGORY]), `keep` (false positive); toplu aksiyon; canlı render; geri alınabilir (audit `PII_REVEAL`).
- **US4 — Tutarlı pseudonimleştirme**: SHA-256 + context vektörü ile canonical entity ID; varyant merge UI ("Dr. Ayşe Yılmaz" ≡ "Ayşe" ≡ "Yılmaz"); monotonic counter; şifreli mapping tablosu.
- **US5 — Kontrollü tersine çevirme**: AES-256-GCM decrypt modal; her reveal immutable audit; toplu reveal yok (kasıtlı sürtünme).
- **US6 — Risk raporu + export guardrail**: 0–100 risk skoru; HTML/PDF raporu (8 dilde); işlenmemiş yüksek-risk PII'li export'ta hard block / override (audit).
- **US7 — Consent takibi**: katılımcı başına onam (ses/alıntı/yayın/paylaşım); alıntıda onamsız publication uyarısı.

### 🏗️ Teknik Mimari

**Hibrit Tespit Pipeline**:

```
Raw Document Text → Regex Engine → Validator (checksum) → NER Engine → Resolver/Dedup → PIIEntity[]
```

**Veri Modeli**:

```typescript
type PIIType =
  | 'EMAIL'|'PHONE'|'TCKN'|'SSN'|'IBAN'|'CREDIT_CARD'|'URL'|'IP_ADDRESS'
  | 'DATE_OF_BIRTH'|'ADDRESS'|'POSTAL_CODE'|'PERSON_NAME'|'ORGANIZATION'
  | 'LOCATION'|'OCCUPATION'|'USERNAME'|'SIGNATURE'|'PASSPORT'|'DRIVERS_LICENSE';
type PIIRiskLevel = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
type PIIAction = 'PENDING'|'REDACT'|'PSEUDONYMIZE'|'MASK'|'REPLACE_CATEGORY'|'KEEP';

interface PIIEntity {
  id: string; documentId: string; type: PIIType; riskLevel: PIIRiskLevel;
  startOffset: number; endOffset: number;
  textOriginalEncrypted: string; textOriginalIV: string;  // AES-256-GCM
  detectionSource: 'REGEX'|'NER'|'MANUAL'; detectionConfidence: number;
  detectionLanguage: string; status: PIIAction;
  canonicalEntityId?: string; pseudonym?: string;
  reviewerId?: string; reviewedAt?: number;
  createdAt: number; updatedAt: number; notes?: string;
}

interface PseudonymMapping {
  canonicalEntityId: string; pseudonym: string; pseudonymScheme: 'PARTICIPANT_NN'|'ORG_NN'|'LOCATION_NN'|'CUSTOM';
  originalHash: string; variantTexts: string[]; variantHashes: string[];
  piiType: PIIType; consentRecordId?: string; createdAt: number;
}

interface ConsentRecord {
  id: string; canonicalEntityId?: string; participantLabel?: string;
  audioRecordingConsent: boolean; directQuoteConsent: boolean;
  publicationConsent: boolean; dataSharingConsent: boolean;
  withdrawalOfConsent?: boolean; signedDate?: number; notes?: string;
  documentIds: string[]; createdAt: number; updatedAt: number;
}

interface PIIRiskReport {
  projectId: string; generatedAt: number;
  documentReports: Array<{ documentId: string; documentName: string; riskScore: number; entitiesByType: Record<PIIType, { total: number; processed: number; remaining: number }>; topRiskUnprocessed: PIIType[] }>;
  projectRiskScore: number;
  summary: { totalPII: number; redacted: number; pseudonymized: number; masked: number; kept: number; pending: number };
  auditTrailHash: string;
}
```

**Tespit Türleri ve Pattern'ler** (örnek):

| PII Türü | Risk | Regex | Validator | NER? | Diller |
|---|---|---|---|---|---|
| TCKN | CRITICAL | `[1-9]\d{10}` | **11-basamak checksum** | Hayır | TR |
| IBAN | HIGH | `[A-Z]{2}\d{2}[A-Z0-9]{11,30}` | **MOD-97** | Hayır | ALL |
| CREDIT_CARD | CRITICAL | `(?:\d[ -]*?){13,19}` | **Luhn** | Hayır | ALL |
| EMAIL | MEDIUM | `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` | RFC-lite | Hayır | ALL |
| PERSON_NAME | HIGH | — | — | **Evet** | ALL |

**TCKN Checksum** (örnek):

```typescript
export function isValidTCKN(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 11 || digits[0] === '0') return false;
  const d = digits.split('').map(Number);
  const oddSum = d[0]+d[2]+d[4]+d[6]+d[8], evenSum = d[1]+d[3]+d[5]+d[7];
  if (((oddSum*7)-evenSum) % 10 !== d[9]) return false;
  if (d.slice(0,10).reduce((a,b)=>a+b,0) % 10 !== d[10]) return false;
  return true;
}
```

Benzer şekilde `isValidIBAN` (MOD-97, BigInt) ve `isValidLuhn`.

**Güvenlik Mimarisi** (3 katmanlı anahtar):
```
OS Keychain (Tauri keyring crate) → QualityOpen master key (256-bit)
        ↓ unwrap
Project file header.wrappedDataKey → Project data key (256-bit, AES-KW)
        ↓ AES-256-GCM (per-entity IV)
IndexedDB: pii_entities → textOriginalEncrypted (base64)
```

Rust tarafında `pii_encrypt`/`pii_decrypt` (`aes-gcm`, `zeroize` crate); anahtar JS heap'inden uzak, AES-NI hızlandırması.

**Audit Trail**: yeni olaylar `PII_SCAN_STARTED`, `PII_SCAN_COMPLETED`, `PII_ACTION_APPLIED`, `PII_ACTION_REVERTED`, `PII_REVEAL`, `PII_ENTITY_MERGED`, `PII_EXPORT_BLOCKED`, `PII_EXPORT_OVERRIDE`, `CONSENT_UPDATED`. ⚠️ **ÖN-KOŞUL**: Mevcut audit log **düz append-only dizidir — hash-chaining YOK**. `auditTrailHash`'in "kriptografik tahrif kanıtı" olabilmesi için önce audit log'a hash-chaining (her giriş bir önceki girişin `prevHash`'ini referanslar) eklenmelidir. Bu, PII'dan **bağımsız ayrı bir altyapı işidir** ve PII'nın gerçek efor tahminine dahil edilmelidir.

**Frontend Modülleri**: `src/services/pii/{types,patternEngine,patterns/{tr,en,de,es,fr,it,pt,nl},validators/{tckn,iban,luhn,ssn},nerEngine,scanner,crypto,pseudonymStore,riskScore,exportGuardrail,reportGenerator}.ts`, `src/store/{piiStore,consentStore}.ts`, `src/workers/piiScanner.worker.ts`, `src/components/PII/{PIIReviewPanel,PIIReviewItem,PIIBulkActions,PIIHighlightOverlay,PIIScanWizard,PIIRiskDashboard,PIIRevealModal,PseudonymMergeDialog,ConsentManager,RiskReportExport}.tsx`.

**Bağımlılıklar**: NPM `@xenova/transformers`, `compromise`, `ulid`, `bigint-mod-arith`; Cargo `aes-gcm`, `keyring`, `zeroize`, `base64`, `sha2`.

**Performans**: Web Worker; streaming tespit (büyük belgeler); NER batching; regex derleme cache; IndexedDB indeks `(documentId, status, type)`; lazy decryption. Hedef SLA: 10K kelime < 60 sn, 100K kelime < 8 dk.

### 🎨 UI/UX Tasarımı

```
┌────────────────────────────────────────────────────────────────────┐
│  [Belge Editörü]                          │  🔍 PII Review          │
│  ┌─────────────────────────────┐           │  📄 interview_03.docx   │
│  │Dr. Ayşe Yılmaz⟩ bugün       │           │  Risk: ████████░ 78     │
│  │söyledi ki ⟨ay.yilmaz@uni.tr⟩│          │  12 PII · 7 bekliyor    │
│  │telefonum ⟨0532 123 45 67⟩   │           │  [Tümü Redact] [Tümü    │
│  └─────────────────────────────┘           │   Pseudonymize]         │
│                                            │  ▼ CRITICAL (2)         │
│                                            │  🆔 TCKN: 10012345678   │
│                                            │   Bekliyor              │
│                                            │   [Redact][Pseud.][Mask]│
│                                            │  ▼ HIGH (5)             │
│                                            │  👤 "Dr. Ayşe Yılmaz"   │
│                                            │   conf: 0.94 · NER      │
│                                            │   → Participant_03 ✓    │
└────────────────────────────────────────────────────────────────────┘
```

Toplu tarama sihirbazı (3 adım: kapsam / motor / diller); risk panosu (belge bazlı + PII türü dağılımı); consent manager (katılımcı başına onam matrix).

### 📅 Uygulama Aşamaları

**Faz 1 (MVP)** — 3–4 hafta: veri modeli + store + IndexedDB migration; regex engine (TR+EN öncelikli) + validator'lar; PII Review Panel + highlight; 5 aksiyon (belge-içi); audit entegrasyonu; AES-256-GCM crypto + reveal modal; Web Worker; golden dataset (TR+EN).
**Faz 2** — 3–4 hafta: transformers.js NER + `compromise` fallback + Ollama adapter; `canonicalEntityId` + proje-geneli pseudonym mapping; entity merge UI; confidence eşikleri; performans (batching, streaming).
**Faz 3** — 2–3 hafta: `ConsentRecord` + ConsentManager; risk skoru + risk raporu (HTML/PDF, 8 dil); export guardrail (Word/HTML/CSV öncesi block/override).
**Faz 4 (opsiyonel)** — 2–3 hafta: kalan 6 dil pattern'leri; Candle (Rust) sidecar NER; quasi-identifier korelasyon analizi.

### 🧪 Test Stratejisi
- **Golden dataset**: her dil için sentetik belgeler + ground truth annotation; **precision/recall/F1**.
- Hedefler: formatlı PII precision ≥ 0.99, recall ≥ 0.95; PERSON_NAME (NER) precision ≥ 0.90, recall ≥ 0.80; genel F1 ≥ 0.90.
- **Pseudonymization tutarlılık**: 5 belgede farklı yazımlar → aynı `Participant_03`; monotonic counter; export/import round-trip.
- **Crypto round-trip**: 10K farklı PII; yanlış data key `DecryptionError`; tahrif edilmiş ciphertext tag hatası (GCM); `zeroize` memory testi.
- **Export guardrail**: high-risk PII'li export block/override akışı.
- **Performans**: 100K kelime < 8dk; 1000 PII entity smooth render (60fps).

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltma |
|------|------|---------|
| **Over-redaction → araştırma değeri kaybı** | Yüksek | Default `PENDING` + insan onayı; pseudonymization tercih edilir; kategori-bazlı onaylı "Tümünü redact"; uyarı. |
| **Under-redaction → PII sızıntısı** | KRİTİK | Export guardrail hard block + risk skoru; quasi-identifier analizi (Faz 4); "anonimleştirme kesin değildir" disclaimer. |
| **NER yanlış pozitif/negatif** | Yüksek | Confidence + insan onayı; kullanıcı eşiği; context-aware re-prompt (Ollama). |
| **Büyük belge performansı** | Orta | Web Worker + streaming + parallel patterns. |
| **Anahtar kaybı** | Orta | Recovery phrase (BIP-39); pseudonym mapping hash+pseudonym kısmı kurtarılabilir (orijinal metin değil). |
| **Model boyutu (180MB)** | Düşük | Kullanıcı seçeneği; `compromise` (200KB) default; ağır NER opt-in. |
| **Dil kapsamı tutarsızlığı** | Orta | Dil-bazlı risk ağırlığı; "tespit güvenilir değil" rozeti; topluluk katkı. |
| **Hukuki yanılgı** | KRİTİK | Açık disclaimer: "QualityOpen teknik araçtır, hukuki tavsiye değildir. GDPR/KVKK yükümlülüğü araştırmacıya aittir." |

### ⏱️ Efor: **~10–14 hafta** (paralelleştirilebilir). Kritik yol: Faz 1 → Faz 3 (IRB başvurusu için).

### 📊 Başarı Metrikleri
- Formatlı PII precision ≥ 0.99; PERSON_NAME ≥ 0.90; tüm türler recall ≥ 0.85.
- Pseudonymization consistency %100.
- Export guardrail coverage %100; audit bütünlüğü %100.
- 10K kelime < 60sn; 100K kelime < 8dk.
- SUS skoru ≥ 75 (5 araştırmacı usability).
- En az 1 gerçek IRB başvurusunda PII raporu ek olarak kabul.

### 🔒 Uyumluluk Notları
- **GDPR Art. 25** (data protection by design): PII tespiti varsayılan açık.
- **GDPR Art. 32** (security): AES-256-GCM + OS keychain + zeroize.
- **GDPR Art. 5(1)(c)** (minimisation): pseudonymization.
- **GDPR Art. 17** (right to erasure): canonical lookup tüm belgelerde etkili.
- **KVKK**: özel nitelikli veriler için açık rıza (consent tracking); Madde 12 (veri güvenliği).
- **HIPAA (opsiyonel)**: Safe Harbor 18 identifier; veri cihazdan çıkmaz (BAA gerektirmez).
- **FAIR**: anonimleştirilmiş veri paylaşılabilirken orijinal PII korunur.

> **Etik not**: Bu özellik anonimleştirmeyi *kolaylaştırır* ama *garanti etmez*. Yeniden tanımlanma riski sıfır değildir. Nihai etik sorumluluk araştırmacıya aittir — tüm UI ve raporlarda açıkça belirtilir.

---

# Bölüm 4 — Metodoloji İş Akışları (Özellik 8–11)

> Bu dört özellik, QualityOpen'u jenerik bir kodlama aracından **rehberli, metodoloji-duyarlı bir araştırma yoldaşına** dönüştürür. Her metodoloji, mevcut özelliklerin (code tree, thematic network, reflexivity journal, audit trail, saturation radar, "Zap"/disconfirming evidence, code matrix) **üzerine kurulu** faz bazlı bir sihirbazdır. Tüm metodolojiler hem `guided` (varsayılan) hem de `flexible` mod sunar — araç asla dogmatik bir kısıtlayıcı değildir.

**Paylaşılan Veri Modeli** (`src/types/methodology.ts`):

```typescript
type MethodologyId = 'thematic'|'grounded-theory'|'framework'|'phenomenology';

interface MethodologyWorkflow {
  id: string; projectId: string; methodology: MethodologyId;
  mode: 'guided'|'flexible'; currentPhaseId: string;
  phaseProgress: Record<string, PhaseState>; config: MethodologyConfig;
  startedAt: string; updatedAt: string;
}

interface PhaseState {
  phaseId: string; status: 'not-started'|'in-progress'|'complete';
  deliverables: Deliverable[]; reflections: ReflectionEntry[];
  startedAt?: string; completedAt?: string;
}

interface Deliverable {
  id: string; label: string; type: 'checklist'|'document'|'artifact-link'|'reflection';
  completed: boolean; completedAt?: string;
  validation: DeliverableValidation; artifactRef?: { kind: 'memo'|'network'|'code'|'matrix'; id: string };
}
```

**Proje Stili genişletme** (⚠️ Mevcut tip: `Project.projectType?: "primary" | "meta-synthesis"` — yeni bir `ProjectStyle` tipi **YOK**; bu mevcut `projectType` alanı genişletilmeli):
```typescript
// Mevcut değerler korunur, metodoloji stilleri eklenir:
type ProjectType =
  | 'primary' | 'meta-synthesis'   // MEVCUT
  | 'thematic-analysis'      // Özellik 8
  | 'grounded-theory'        // Özellik 9
  | 'framework-analysis'     // Özellik 10
  | 'phenomenology';         // Özellik 11
```

**Cross-Feature Entegrasyon Matrisi**:

| Metodoloji | Code Tree | Reflexivity Journal | Thematic Network | Saturation Radar | Disconfirming "Zap" | Audit Trail | Cases (Ö5) | ICR (Ö2) |
|---|---|---|---|---|---|---|---|---|
| **Thematic (8)** | ✓ Faz 2 | ✓ tüm fazlar | ✓ Faz 3 | ⚠ (reflexive'da uyarı) | ✓ Faz 4b | ✓ | opsiyonel | ⚠ yalnız coding-reliability |
| **Grounded Theory (9)** | ✓ açık kodlama | ✓ (memolar) | ✓ Anchor Node | ✓ (kategori bazlı, **genişletilmiş**) | ✓ constant comp. | ✓ | ✓ theoretical sampling | ✗ |
| **Framework (10)** | ✓ çerçeve kodları | ✓ Faz 1, 5 | opsiyonel Faz 5 | — | ✓ Faz 5 mapping | ✓ | **✓ (matris satırları)** | ✓ indexing |
| **Phenomenology (11)** | ⚠ (uyarı) | ✓ (epoché) | ✗ (uygunsuz) | ✗ (uygunsuz, gizli) | opsiyonel | ✓ | ✓ (katılımcılar) | ✗ |

---

## 8. Tematik Analiz Sihirbazı (Thematic Analysis Wizard — Braun & Clarke 6 Faz)

### 🎯 Amaç ve Değer Önerisi
Tematik Analiz (TA) nitel araştırmada en yaygın yaklaşımdır ama sıklıkla **yanlış anlaşılır** — kod sayma, ICR dayatması ve theme definition eksikliği konusunda. Bu sihirbaz araştırmacıyı Braun & Clarke'ın (2006; 2022) **6 fazından** geçirir: her faz için eğitici kontekst, yapılandırılmış teslimat (deliverable) kontrol listeleri, **gating** (tamamlanmadan ilerleme engellenir — `flexible` modda baypas), reflexive prompt'lar ve mevcut araçlara derin bağlantılar (code tree → Faz 2; thematic network → Faz 3; reflexivity journal → tüm fazlar).

**Hedef kullanıcılar**: lisansüstü öğrenciler, nitel araştırmaya yeni başlayanlar, TA'yı ilk kez disiplinli uygulayan araştırmacılar.

### 📚 Metodolojik Temel
- **Braun & Clarke (2006)**. *Using thematic analysis in qualitative research.* QRP, 3(2), 77–101. → 6 fazın orijinal formülasyonu.
- **Braun & Clarke (2022)**. *Thematic Analysis: A Practical Guide.* Sage. → "Reflective TA" vurgusu.
- **Clarke & Braun (2018)**. → Üç TA geleneği ayrımı: **Reflexive TA / Codebook TA / Coding Reliability TA**.
- **Braun & Clarke (2019)**. → TA'da saturation eleştirisi; "information power" vurgusu.

**Kritik metodolojik not**: Reflexive TA modunda (önerilen) **ICR önerilmez**; bunun yerine araştırmacının subjectivity'si vurgulanır. Bu, Özellik 2 ile çatışan bir duruştur — UI bunu açıkça belirtmelidir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri
- **US-TA1**: Yeni projede "Tematik Analiz (Braun & Clarke)" stili; `MethodologyWorkflow` kaydı, faz 1'e konumlanma; `mode` varsayılan `guided`.
- **US-TA2**: Faz başına 2–4 teslimat; gated teslimat tamamlanmadan "Sonraki Faz" disabled (tooltip); `flexible` modda uyarı + audit.
- **US-TA3**: Her faz için ≥1 reflexive prompt; yanıtlar `PhaseState.reflections`'a + reflexivity journal'a aynalanır.
- **US-TA4**: Faz kartında "Bu faz için ilgili araç" butonları (bağlam filtreli).
- **US-TA5**: Tüm fazlar tamamlandığında Braun & Clarke (2006; 2022) referanslı Methods bölümü taslağı (TR/EN).

### 🏗️ Teknik Mimari

```typescript
type TAMode = 'reflexive'|'codebook'|'coding-reliability';

interface TAConfig extends MethodologyConfig {
  taMode: TAMode;
  inductiveDeductive: 'inductive'|'deductive'|'hybrid';
  semanticLatent: 'semantic'|'latent';
}
```

**6 Faz Tanımı** (`src/lib/methodology/thematic/phases.ts`):

| Faz ID | Adı | Teslimatlar | Gating |
|---|---|---|---|
| `ta-1-familiarization` | Familiarization | Tüm kaynaklar okundu + ≥1 memo | Evet |
| `ta-2-coding` | Generating Initial Codes | ≥1 kod + ≥N segmente uygulandı | Evet |
| `ta-3-searching-themes` | Searching for Themes | ≥1 thematic network + kodlar temalara gruplandı | Evet |
| `ta-4a-review-extracts` | Reviewing (Level 1) | Tema-coded extract tutarlılığı | Evet |
| `ta-4b-review-dataset` | Reviewing (Level 2) | Tüm veri setinde tema coverage | Evet |
| `ta-5-defining` | Defining & Naming | Her tema için isim + tanım | Evet |
| `ta-6-report` | Producing the Report | Rapor üretildi | Evet |

> Faz 4 Braun & Clarke'ın iki düzeyli incelemesini yansıtır (`ta-4a` coded extracts, `ta-4b` full dataset).

**Bütünleşme**: Code tree → Faz 2 `code.created` olayını dinler; Thematic network → Faz 3; Reflexivity journal → tüm fazlar; Audit trail → faz geçişleri + `flexible` baypas; Saturation radar → reflexive modda "information power" uyarısı; Disconfirming "Zap" → Faz 4b; Code matrix → Faz 4. ⚠️ ICR yalnız `coding-reliability` modunda.

**Frontend Modülleri**: `src/components/methodologies/MethodologyWizardShell.tsx`, `src/components/methodologies/thematic/{ThematicWizard,PhaseCard,DeliverableChecklist,ReflexivePromptPanel,TAModeSelector,ReportPreview}.tsx`, `src/store/methodologyStore.ts`, `src/lib/methodology/reporters/thematicReporter.ts`.

**Raporlama Çıktısı**:
```markdown
## Methods — Thematic Analysis
We conducted reflexive thematic analysis following Braun and Clarke (2006, 2022).
TA mode: reflexive; orientation: inductive/semantic.
Phase 1: N=42 documents reviewed; 12 familiarization memos.
Phase 2: 187 codes generated.
Phase 3: 8 candidate themes via thematic mapping.
Phase 4: Level-1 + Level-2 checks; 2 themes merged, 1 discarded.
Phase 5: 6 final themes with definitions.
Phase 6: see Results.
All coding decisions logged in immutable audit trail.
```

### 🎨 UI/UX Tasarımı

```
┌──────────────────────────────────────────────────────────┐
│  TEMATİK ANALİZ (Reflexive TA)        Mod: [Guided ▾]    │
├──────────────────────────────────────────────────────────┤
│  ●━━━━ Faz 1 — Familiarization          ✓ Tamamlandı    │
│  ●━━━━ Faz 2 — Generating Initial Codes ✓ Tamamlandı    │
│  ◉──── Faz 3 — Searching for Themes     ► Aktif         │
│  ○····· Faz 4 — Reviewing Themes                        │
│         ├ 4a — Coded extracts                            │
│         └ 4b — Full dataset                              │
│  ○····· Faz 5 — Defining & Naming                       │
│  ○····· Faz 6 — Producing the Report                    │
└──────────────────────────────────────────────────────────┘

┌─ Faz 3: Temaları Arama ──────────────────────────────────┐
│ ℹ️ Braun & Clarke: "Bir tema bir araştırma sorusu etrafında │
│    anlamlı bir örüntü yakalar."                            │
│ Teslimatlar:                                               │
│  ☑ En az 1 tematik ağ oluştur                              │
│  ☐ Kodları temalara gruplandır                             │
│ [→ Thematic Network'i Aç]   [→ Code Tree'i Aç]            │
│ [Sonraki Faz: İnceleme ▸]   (2 teslimat bekleniyor)       │
└──────────────────────────────────────────────────────────┘
```

### 📅 Uygulama Aşamaları
**Faz 1 (MVP)** — 3.5 hafta: `methodologyStore` + `phaseMachine.ts`; 6 faz + teslimatlar + gating; TA mode selector; stepper UI; code tree/network/journal köprüleri; audit entegrasyonu.
**Faz 2** — 2 hafta: reflexive prompt'lar + journal aynalama; `thematicReporter` (Markdown + DOCX); flexible mode baypas.
**Faz 3** — 2 hafta: "Bu fazı derinlemesine anla" modal (literatür + tuzaklar); TA moduna göre prompt setleri; Faz 4 iki-düzeyli görselleştirme; TR/EN rapor.

### 🧪 Test Stratejisi
Örnek veri seti (6 katılımcı transkripti, TR+EN, 3 disiplin); `canAdvance()` unit test'leri; `code.created` olay tetikleme; rapor snapshot; akademik danışman incelemesi (reflexive vs codebook ayrımı).

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltıcı |
|---|---|---|
| Metodolojik dogmatizm | Yüksek | `flexible` mod (gating baypas + audit); faz sırası düzenleme |
| TA mode karışıklığı | Orta | Selector'da metodolojik açıklama; ICR paneli koşullu |
| Eğitici içeriğin yaşlanması | Orta | Faz açıklamaları JSON'da |
| Akademik danışmanlık eksikliği | Yüksek | Topluluk geri bildirimi; pilot grup |

### ⏱️ Efor: **~7.5 hafta** (tek geliştirici ~12 hafta).

### 📊 Başarı Metrikleri
- Sihirbazı faz 6'ya tamamlama oranı.
- "TA metodolojisini daha iyi anladım" ≥ 4/5.
- Proje başına ortalama reflexive prompt ≥ 4.
- 6 fazın raporda doğru sırayla yer alma oranı %100.

---

## 9. Gömülü Teori Araç Seti (Grounded Theory Toolkit — Strauss & Corbin / Charmaz)

### 🎯 Amaç ve Değer Önerisi
Gömülü Teori (GT) teori üretmeyi amaçlayan en sistematiğin nitel yaklaşımlardan biridir; ancak araç gereksinimleri (theoretical sampling, constant comparison, paradigm model, çoklu memo türleri) jenerik kodlama araçlarında dağıtık hale gelir. Bu araç seti GT'nin **ayırt edici pratiklerini** tek arayüzde toplar: açık/eksenel/seçici kodlama fazları, **Paradigm model builder** (Strauss & Corbin), **Theoretical sampling tracker** (kategori bazlı saturation), **Constant comparison matrix**, **üç tür memo** (teorik/operasyonel/kod — mevcut **düz-metin** memo/journal altyapısını genişleterek; ⚠️ Markdown render mevcut değil, eklenmesi gerekirse ek iş).

**Hedef kullanıcılar**: doktora öğrencileri, sosyoloji/hemşirelik/eğitim bilimleri GT uygulayıcıları.

### 📚 Metodolojik Temel
- **Glaser & Strauss (1967)**. *The Discovery of Grounded Theory.* → Doğuş, constant comparative method.
- **Strauss & Corbin (1990/1998)**. *Basics of Qualitative Research.* → Eksenel kodlama paradigm model (Causal conditions / Context / Intervening conditions / Action-Interactional strategies / Consequences), seçici kodlama, conditional matrix.
- **Charmaz (2006/2014)**. *Constructing Grounded Theory.* → Constructivist GT, initial/focused/theoretical coding, memo.
- **Glaser (1978)**. *Theoretical Sensitivity.* → Teorik duyarlılık.
- **Birks & Mills (2011)**; **Bryant & Charmaz (2007)**.

**Kritik metodolojik not**: Strauss & Corbin (prosedürel/objektivist) ile Charmaz (constructivist) arasında gerilim. Sihirbaz her iki alt-yolu da destekler.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri
- **US-GT1**: Proje oluştururken "Grounded Theory" + altsınıf (Strauss-Corbin procedural / Charmaz constructivist).
- **US-GT2**: Eksenel kodlamada paradigm model builder (6 kutu); her kutuya kod/memo bağlanır; Anchor Node'a render.
- **US-GT3**: Theoretical sampling tracker — kategori bazlı saturation + "next data needed" notu; kararlar audit'e.
- **US-GT4**: Constant comparison matrix (satırlar: incidents, sütunlar: kategoriler, hücreler: benzerlik/fark/emergent property).
- **US-GT5**: Üç tür memo (teorik/operasyonel/kod) — mevcut memo editörü (⚠️ düz-metin; Markdown render eklenmeli); çift yönlü kod/kategori bağlantısı.

### 🏗️ Teknik Mimari

```typescript
interface GTConfig extends MethodologyConfig {
  branch: 'strauss-corbin'|'charmaz';
  codingPhases: 'open-axial-selective'|'initial-focused-theoretical';
}

interface GTMemo {
  id: string; projectId: string;
  type: 'theoretical'|'operational'|'code'|'reflective';
  title: string; body: string;  // Markdown
  linkedCodeIds: string[]; linkedCategoryIds: string[];
  linkedParadigmModelId?: string; createdAt: string; updatedAt: string;
}

interface ParadigmModel {
  id: string; projectId: string; coreCategory: string|null;
  causalConditions: ParadigmNode[]; context: ParadigmNode[];
  interveningConditions: ParadigmNode[];
  actionInteractionalStrategies: ParadigmNode[]; consequences: ParadigmNode[];
  updatedAt: string;
}

interface TheoreticalSamplingPlan {
  id: string; projectId: string;
  categorySampling: CategorySamplingStatus[]; decisions: SamplingDecision[];
}

interface CategorySamplingStatus {
  categoryId: string; saturationLevel: number;  // 0–1 (saturation radar'dan)
  status: 'unsaturated'|'approaching'|'saturated';
  nextDataNeeded: string; incidentsCount: number; lastReviewedAt: string;
}

interface ConstantComparisonEntry {
  id: string; incidentSegmentId: string; categoryId: string;
  comparedWithSegmentIds: string[];
  similarities: string; differences: string; emergingProperty: string;
}
```

**Aşama Motoru**: GT'de faz geçişleri **döngüseldir** (theoretical sampling açık kodlamaya geri döner). `phaseMachine.ts`'in GT için `allowLoopback: true` modu. Fazlar (Strauss-Corbin): `gt-open` → `gt-axial` → `gt-selective`; (Charmaz): `gt-initial` → `gt-focused` → `gt-theoretical`. Theoretical sampling döngüsü her fazla paralel yürür.

**Bütünleşme**: Code tree → açık kodlamada "Kategoriye yükselt" (⚠️ mevcut `Code` tipinde `level` alanı **yok** — `level: 'category'` için yeni alan eklenmeli; mevcut hiyerarşi yalnız `parentId`); memo editör → GT memoları (`type` etiketiyle; düz-metin); Thematic network → paradigm model merkezde core category (⚠️ mevcut `ThematicNetwork` basit dairesel yerleşim — **"Anchor Node" kavramı yok, eklenmeli**); **Saturation radar genişletme** (kategori bazlı — mevcut `SaturationChart` yalnız doküman ekseninde, kategori boyutu yeni iş); Disconfirming "Zap" → constant comparison matrisinde "teori çürütme" uyarısı; Audit trail → sampling kararları; Cases (Ö5) → demografik alt-grup doygunluğu.

**Frontend Modülleri**: `src/components/methodologies/grounded-theory/{GTToolkit,CodingPhaseTabs,ParadigmModelBuilder,TheoreticalSamplingTracker,ConstantComparisonMatrix,GTMemoEditor}.tsx`, `src/lib/methodology/reporters/gtReporter.ts`.

### 🎨 UI/UX Tasarımı

```
┌─ GÖMÜLÜ TEORİ (Constructivist — Charmaz) ─────────────────┐
│ [Açık Kodlama] [Eksenel] [Seçici] [Theoretical Sampling]  │
│ [Constant Comparison] [Memolar] [Paradigm Model]          │
└──────────────────────────────────────────────────────────┘

Paradigm Model Builder:
                    ┌─ Causal Conditions ─┐
                    │  [kod1] [kod2]  +   │
                    └──────────┬──────────┘
        ┌──────────────┐   ┌──▼──────────────┐   ┌──────────────┐
        │ Intervening  │◀─▶│ CORE PHENOMENON │◀─▶│   Context    │
        │ Conditions   │   │ "[core category]"│   │ [kod3][kod4] │
        └──────────────┘   └──────┬───────────┘   └──────────────┘
                           ┌──────▼───────────┐
                           │ Action/Interaction│
                           │ Strategies        │
                           └──────┬───────────┘
                           ┌──────▼───────────┐
                           │   Consequences   │
                           └──────────────────┘

Theoretical Sampling Tracker:
│ Kategori          │ Saturation  │ Sonraki Veri          │
│ "Boundary work"   │ ████████░░  │ Çalışan anne görüşmesi│
│ "Status anxiety"  │ ██████████  │ — Doygun              │
│ "Code switching"  │ ███░░░░░░░  │ Yeni başlayan genci   │
```

### 📅 Uygulama Aşamaları
**Faz 1 (MVP)** — 4 hafta: GTConfig + 3 kodlama fazı etiketi + kategoriya yükseltme; memo editor (3 tür, şablonlu); audit entegrasyonu; theoretical sampling tracker.
**Faz 2** — 3.5 hafta: Paradigm Model Builder (görsel + Anchor Node render); constant comparison matrix; saturation radar genişletme (kategori bazlı); GT reporter.
**Faz 3** — 2.5 hafta: Strauss vs Charmaz yol ayrımı; teorik duyarlılık prompt'ları; conditional matrix (opsiyonel).

### 🧪 Test Stratejisi
~25 incidents içeren klasik GT örneği; paradigm model doğruluğu (5 bileşen); saturation besleme unit test; memo round-trip; GT uzmanı incelemesi.

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltıcı |
|---|---|---|
| Prosedürel dogmatizm (paradigm model zorunlu) | Yüksek | Charmaz modunda opsiyonel; "soft" kullanım |
| Paradigm model görsel karmaşıklık | Orta | Anchor Node uyumu; sade kutu diyagram |
| Saturation radar'ın yanlış kullanımı | Orta | "Teorik doygunluk" vs "veri doygunluğu" açıklaması |
| Geriye dönük faz döngüsü kafa karışıklığı | Orta | Net "döngüsel" görsel gösterge |

### ⏱️ Efor: **~10 hafta** (tek geliştirici ~16 hafta).

### 📊 Başarı Metrikleri
- GT projelerinin paradigm model tamamlama oranı.
- Proje başına ortalama theoretical sampling kararı.
- Proje başına ortalama teorik memo ≥ 3.
- Saturation radar entegrasyon doğruluğu %100.
- GT uzmanı incelemesinde 3/3 onay.

---

## 10. Çerçeve Analizi (Framework Analysis — Ritchie & Spencer 1994)

### 🎯 Amaç ve Değer Önerisi
Çerçeve Analizi **uygulamalı/polika araştırmalarında** yaygın, **önceden tanımlı tematik çerçeveye** dayanan, hiyerarşik ve **case-bazlı** bir yaklaşımdır. Diğer üç metodolojiden **temel farkı**: veri önce kategorilere göre indekslenir, sonra her vaka için tema-bazında **özetlenir** (charting) ve bir matriste toplanır.

**İmza artefakt**: **Framework Matrix** — satırlar = katılımcılar/vakalar, sütunlar = temalar/alt-temalar, hücreler = **özet metin + kaynak referansları**. Bu matris mevcut **Code Matrix Heatmap**'ten **kesin olarak ayrılır**: heatmap hücreleri **count** gösterirken, framework matrix hücreleri **yapılandırılmış özet metni** (qualitative summary) içerir.

**Hedef kullanıcılar**: sağlık/polika araştırmacıları, program değerlendirme uzmanları, sosyal hizmet uygulayıcıları.

### 📚 Metodolojik Temel
- **Ritchie & Spencer (1994)**. *Qualitative Data Analysis for Applied Policy Research.* → 5 aşamalı yöntemin orijinal formülasyonu.
- **Pope, Ziebland & Mays (2000)**. BMJ, 320. → Sağlık alanında popülerleşme.
- **Gale et al. (2013)**. BMC Med Res Methodol, 13, 117. → Modern uygulamalı rehber.
- **Ward et al. (2013)**; **Lacey & Luff (2009)**.

**Kritik metodolojik not**: Çerçeve Analizi "codebook TA" geleneğindedir (Braun & Clarke'ın sınıflamasında). Özellik 8'in TA mode selector'unda `codebook` seçilirse kullanıcı buraya yönlendirilebilir.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri
- **US-FA1**: 5 aşamalı akış (stepper + teslimat + gating).
- **US-FA2**: Aşama 2 — a priori (literatür) + emergent (veriden) temaları birleştirme (köken işaretiyle).
- **US-FA3**: Aşama 3 — indexing (çerçeve kodlarını segmentlere uygulama).
- **US-FA4**: Aşama 4 — Framework Matrix; hücrelere **özet metin** (count değil); UI'da Code Matrix'ten ayrım etiketi; satırlar = Cases (Ö5).
- **US-FA5**: Aşama 5 — cross-case örüntüleri + yorumlama.

### 🏗️ Teknik Mimari

```typescript
interface FAConfig extends MethodologyConfig {
  caseSource: 'cases-attributes'|'documents';
  includeAPriori: boolean;
}

interface ThematicFramework {
  id: string; projectId: string; themes: FrameworkTheme[]; updatedAt: string;
}

interface FrameworkTheme {
  id: string; label: string; origin: 'a-priori'|'emergent';
  sourceReference?: string; subThemes: FrameworkTheme[]; codeId?: string;
}

interface FrameworkMatrix {
  id: string; projectId: string;
  caseIds: string[]; themeIds: string[];
  cells: Record<string, FrameworkMatrixCell>;  // key: `${caseId}__${themeId}`
  updatedAt: string;
}

interface FrameworkMatrixCell {
  caseId: string; themeId: string;
  summary: string;               // ÖZET METİN — Code Matrix'ten temel fark
  sourceSegmentIds: string[];
  indexReferences: IndexReference[];
  isEmpty: boolean; lastEditedAt: string; lastEditedBy: string;
}
```

**5 Aşama**: `fa-1-familiarization` → `fa-2-framework` → `fa-3-indexing` → `fa-4-charting` → `fa-5-mapping`.

**Mevcut Code Matrix'ten ayırım (KRİTİK)**: Code Matrix Heatmap (mevcut) = satır kaynak/doküman, sütun kod, hücre **count** + heatmap renk. Framework Matrix (yeni) = satır vaka, sütun tema, hücre **özet metin** + segment linkleri. Farklı modüller, farklı amaçlar — UI'da açık etiket.

**Bütünleşme**: Code tree → çerçeve kodları; **Cases (Ö5) → matris satırları (kritik entegrasyon)**; Reflexivity journal → Faz 1, 5; Audit trail → hücre düzenlemeleri; Thematic network → Faz 5 opsiyonel; Disconfirming "Zap" → "bu vaka farklı" işareti; ICR (Ö2) → indexing (codebook geleneği).

**Frontend Modülleri**: `src/components/methodologies/framework/{FrameworkWizard,ThematicFrameworkEditor,FrameworkMatrixGrid,MatrixCell,MappingNotes}.tsx`, `src/lib/methodology/reporters/frameworkReporter.ts`.

### 🎨 UI/UX Tasarımı

```
┌─ Framework Matrix ────────────────────────────────────────────────────┐
│         │  T1: Access    │ T1a: Cost   │ T2: Trust     │ T3: Outcomes  │
│  Case   │  (a-priori)    │ (emergent)  │ (a-priori)    │ (emergent)    │
├─────────┼────────────────┼─────────────┼───────────────┼───────────────┤
│  C-01   │ "Düşük gelirli  │ "İlaç       │ "Hekine       │ "3 ay sonra   │
│ (Kadın, │ aile, ulaşım    │ maliyeti    │ güveniyor..." │ semptom       │
│ 45)     │ sorunu..."      │ ana engel"  │               │ azaldı"       │
│         │ [3 segment]     │ [2 seg]     │ [5 seg]       │ [4 seg]       │
├─────────┼────────────────┼─────────────┼───────────────┼───────────────┤
│  C-02   │ ...             │ ...         │ ...           │ ...           │
│                                                                        │
│  ⚠ Bu Framework Matrix hücreleri ÖZET METİN içerir. Code Matrix'ten   │
│     farklıdır (o sayıları gösterir).                                   │
│ [+ Vaka Ekle]  [+ Tema Ekle]  [CSV/Excel Export]  [Pattern Notes]     │
└────────────────────────────────────────────────────────────────────────┘
```

### 📅 Uygulama Aşamaları
**Faz 1 (MVP)** — 4.5 hafta: 5 aşama stepper + gating; Thematic Framework Editor; indexing (mevcut kodlama arayüzü); Framework Matrix Grid (temel hücre düzenleme + segment link).
**Faz 2** — 3 hafta: Cases entegrasyonu (satırlar = cases); case attribute filtreleme; matrix export (CSV/XLSX/DOCX); mapping notları.
**Faz 3** — 2.5 hafta: çok-kodlayıcı hücre işbirliği; cross-case pattern görselleştirme (network clustering); Spenser-Ritchie numerik indexing otomasyonu.

### 🧪 Test Stratejisi
8 katılımcı sağlık görüşmesi (Gale et al. 2013 formatında); hücre özet metni segmentlerle uyum; Code Matrix ayrımı testi; cross-case pattern manuel doğrulama; Cases entegrasyon akışı.

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltıcı |
|---|---|---|
| Code Matrix ile karıştırma (sayı vs özet) | Çok Yüksek | Açık UI etiketi; ayrı modüller; metodolojik tooltip |
| Cases yoksa matris satırları anlamsız | Yüksek | "documents" fallback; Ö5 ile yakın koordinasyon |
| Hücre şişmesi | Orta | Markdown + fold/collapse |
| A priori çerçeve dogmatizmi | Orta | `emergent` köken desteği; hybrid |
| Performans (büyük matris) | Orta | Virtualized grid; lazy-loading |

### ⏱️ Efor: **~10 hafta** (tek geliştirici ~15 hafta).

### 📊 Başarı Metrikleri
- Matris tamamlanma (dolu/toplam hücre) ≥ %70.
- "framework vs code matrix" karışıklık destek talebi = 0.
- Framework projelerinin Cases kullanma oranı.
- Matrix dışa aktarma oranı.
- Applied-policy araştırmacı rapor incelemesinde 5 aşama onayı.

---

## 11. Fenomenoloji Araç Seti (Phenomenology Toolkit — Moustakas / Giorgi)

### 🎯 Amaç ve Değer Önerisi
Fenomenolojik analiz bir **deneyimin nasıl yaşandığını** ve onun **özünü** (essence) ortaya çıkarmayı amaçlar. Diğer üç metodolojiden **radikal biçimde farklıdır**: kodlama/tematizasyon değil, **anlam birimlerine ayırma**, **textural/structural betimlemeler** ve **kompozit öz sentezi** esastır.

Bu araç seti Moustakas'ın (1994) **transcendental (epoché)** fenomenolojisi ile Giorgi'nin (2009) **descriptive phenomenological method**'unu destekler: Epoché/bracketing, Horizonalization (her anlamlı ifade eşit ağırlıkta), Meaning units → clusters, Imaginative variation, Textural + Structural description → Composite synthesis, Essence statements.

**Hedef kullanıcılar**: fenomenoloji uygulayan hemşirelik, psikoloji, eğitim, felsefe araştırmacıları.

### 📚 Metodolojik Temel
- **Husserl (1913/1931)**. *Ideas I*; *Cartesian Meditations.* → Epoché, phenomenological reduction, eidetic variation.
- **Moustakas (1994)**. *Phenomenological Research Methods.* → Transcendental fenomenoloji akışı.
- **Giorgi (2009)**. *The Descriptive Phenomenological Method in Psychology.* → 4 adım: sense of whole → meaning units → transformation → synthesis.
- **Colaizzi (1978)** — 7 adımlı alternatif.
- **Van Manen (1990)**. *Researching Lived Experience.* → Hermeneutic (bu araç **descriptive**'e odaklanır; hermeneutik opsiyonel not).

**Kritik metodolojik not**: Moustakas'ın "modification" yaklaşımı ile Giorgi'nin "transformation" yaklaşımı arasında ince fark. Sihirbaz Moustakas + Giorgi modlarını destekler; Colaizzi opsiyonel.

### 👤 Kullanıcı Hikayeleri ve Kabul Kriterleri
- **US-PH1**: Epoché/bracketing — ön kabulleri açıkça yazma; reflexivity journal'a "Epoché" etiketiyle aynalama.
- **US-PH2**: Horizonalization — tüm anlamlı ifadeleri eşit ağırlıkta, non-redundant listeleme.
- **US-PH3**: Meaning units → clusters (sürükle-bırak).
- **US-PH4**: Imaginative variation + textural/structural description.
- **US-PH5**: Bireysel + kompozit essence statements.

### 🏗️ Teknik Mimari

```typescript
interface PHConfig extends MethodologyConfig { mode: 'moustakas'|'giorgi'|'colaizzi'; }

interface EpochEntry {
  id: string; projectId: string;
  prompt: string; researcherAssumption: string;
  bracketingStrategy: string; createdAt: string;
}

interface MeaningUnit {
  id: string; projectId: string; participantId?: string;
  originalStatement: string; sourceSegmentId: string;
  nonRedundant: boolean; equalWeight: boolean;
  clusterId?: string; transformedExpression?: string;  // Giorgi
  invariantConstituent?: boolean;  // Moustakas
  createdAt: string;
}

interface MeaningCluster {
  id: string; projectId: string; title: string; theme: string;
  meaningUnitIds: string[]; notes?: string;
}

interface PhenomenologicalDescription {
  id: string; projectId: string;
  type: 'textural'|'structural'|'composite';
  participantId?: string; content: string;  // Markdown
  imaginativeVariations?: string[]; derivedFromClusterIds: string[];
}

interface EssenceStatement {
  id: string; projectId: string; participantId?: string;
  statement: string; derivedFromDescriptionIds: string[];
}

interface CompositeSynthesis {
  id: string; projectId: string;
  texturalDescriptionId: string; structuralDescriptionId: string;
  content: string; essenceStatementIds: string[];
}
```

**7 Faz** (Moustakas): `ph-1-epoche` → `ph-2-horizonalization` → `ph-3-clustering` → `ph-4-imaginative-variation` → `ph-5-textural` → `ph-6-structural` → `ph-7-composite`. Giorgi modunda: `sense-of-whole` → `meaning-units` → `transformation` → `synthesis`. Colaizzi 7 adım.

**Bütünleşme**: Reflexivity journal (düz-metin) → Epoché girişleri (en derin entegrasyon); Code tree → ⚠ fenomenolojide geleneksel kodlama **yoktur** (UI uyarısı); source segment seçimi → horizonalization için; Audit trail → tüm fazlar; Thematic network → ⚠ sınırlı (fenomenoloji tematik değil); **Saturation radar → uygulanmaz (UI gizler, metodolojik uyumsuzluk)**; Disconfirming "Zap" → opsiyonel; Cases (Ö5) → katılımcılar = cases.

**Frontend Modülleri**: `src/components/methodologies/phenomenology/{PhenomenologyWizard,EpochePanel,HorizonalizationList,MeaningUnitCard,ClusterCanvas,DescriptionEditor,EssenceStatementPanel}.tsx`, `src/lib/methodology/reporters/phenomenologyReporter.ts`.

### 🎨 UI/UX Tasarımı

```
┌─ Horizonalization — P-03 ─────────────────────────────────┐
│ ℹ️ Moustakas: her ifadeyi eşit ağırlıkta ve non-redundant  │
│    alın. Henüz hiyerarşi kurmayın.                         │
│ [+] Segment seç → meaning unit ekle                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ MU-01  "O an donup kaldım, sanki zaman durdu."        │ │
│  │   src: P-03 #seg-7   ⚖ equal  ✓ non-redundant  [Cluster ▾]│
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ MU-02  "Sesimi duyamadım, sadece kalp atışım."        │ │
│  │   src: P-03 #seg-12  ⚖ equal  ✓ non-redundant [Cluster ▾]│
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌─ Epoché / Bracketing ─────────────────────────────────────┐
│ Husserlci epoché: fenomenle ilgili ön kabullerinizi       │
│ askıya alın. Bu yanlılığı azaltmak içindir; objektiflik   │
│ değil, farkındalık.                                        │
│ Prompt 1: "Bu fenomenle ilgili kişisel deneyiminiz?"      │
│  [Markdown editor]                                         │
│ Bracketing stratejisi: "Bu kabulleri analize nasıl taşımam?"│
│  [Markdown editor]                                         │
│ [Journal'a Kaydet (Epoché etiketiyle)]                    │
└────────────────────────────────────────────────────────────┘
```

**Metodolojik uygunluk uyarıları**: "Fenomenolojide saturation radar uygulanmaz — gizlenmiştir." / "Code tree'de kod oluşturmak fenomenolojik pratiğin dışındadır; meaning clusters kullanın."

### 📅 Uygulama Aşamaları
**Faz 1 (MVP)** — 3 hafta: 7 fazlı wizard (Moustakas); Epoché paneli + journal entegrasyonu; Horizonalization listesi; audit entegrasyonu.
**Faz 2** — 3.5 hafta: Cluster canvas (sürükle-bırak); description editor (textural/structural/composite); essence statement paneli; phenomenology reporter.
**Faz 3** — 3 hafta: Giorgi modu (transformation sütunu, 4 adım); Colaizzi modu (7 adım); imaginative variation prompt setleri; önermelerle essence türetme.

### 🧪 Test Stratejisi
6 katılımcı "yaşamı değiştiren an" görüşmesi; horizonalization doğruluğu (her birim gerçek segmentten, non-redundant); epoché journal entegrasyonu; composite akış (textural+structural→composite→essence); fenomenoloji uzmanı essence incelemesi; mod ayrımı (Moustakas vs Giorgi).

### ⚠️ Riskler ve Azaltıcı Önlemler

| Risk | Etki | Azaltıcı |
|---|---|---|
| Fenomenoloji = kodlama karıştırma | Yüksek | UI'da code tree uyarısı; cluster canvas ile açık ayrım |
| Epoché'nin formalite olması | Orta | Reflexive prompt'lar + journal etiketleme zorunlu |
| Composite sentezin kalitesiz (kopyala-yapıştır) | Orta | Yapısal şablonlar + imaginative variation zorunluluğu |
| Hermeneutik vs descriptive karışıklık | Orta | Yalnız descriptive modda; Van Manen opsiyonel not |
| Metodolojik dogmatizm | Orta | Flexible mod; cluster yerine serbest not izni |

### ⏱️ Efor: **~9.5 hafta** (tek geliştirici ~14 hafta).

### 📊 Başarı Metrikleri
- Fenomenoloji projelerinin ≥ % kaçı en az 3 epoché girişi tamamlıyor.
- Katılımcı başına ortalama meaning unit ≥ 10.
- Tüm fazları geçenlerin composite essence üretme oranı.
- Code tree karışıklık olayı 0.
- Essence statement uzman onayı 3/3 (içerik geçerliliği).

---

# Ek — Toplam Efor Özeti

> ⚠️ Aşağıdaki değerler **"ideal" tahminlerdir**. Solo geliştiricide gerçekçi süre ≈ × 2–3 (hata ayıklama + CI bakımı + danışman döngüleri dahil — Yapısal Risk #2). Toplam ham efor ~18 ay → "11 özelliği aynı anda" planlamak yerine **"🎯 Nihai Uygulama Planı"ndaki sürüm-sürüm teslim** esastır. Bu tablo yalnız karşılaştırma içindir.

| Özellik | Efor (2 dev paralel) | Efor (1 dev) |
|---|---|---|
| 1. Whisper Transkripsiyonu | ~3.5 hafta | ~4 hafta |
| 3. Yerel LLM (Ollama) | ~3 hafta | ~3.5 hafta |
| 7. Semantik Arama | ~3.5 hafta | ~4 hafta |
| **AI altyapı toplam** | **~8.6 sprint / ~2 ay** (paylaşılan altyapıyla) | |
| 5. Vaka & Öznitelik | ~4–5 hafta | ~5–6 hafta |
| 6. Sorgu Oluşturucu | ~4–5 hafta | ~5–6 hafta |
| 2. ICR | ~6–7 hafta | ~7–8 hafta |
| 4. PII Tespiti | ~8–10 hafta | ~10–14 hafta |
| **Veri modeli + gizlilik toplam** | paralelleştirilebilir | |
| 8. Tematik | 7.5 hafta | 12 hafta |
| 9. Grounded Theory | 10 hafta | 16 hafta |
| 10. Framework | 10 hafta | 15 hafta |
| 11. Fenomenoloji | 9.5 hafta | 14 hafta |
| **Metodoloji paylaşılan altyapı** | 3 hafta | 5 hafta |
| **Metodoloji toplam (paralel)** | ~14 hafta | ~30+ hafta |

### Kritik Başarı Faktörleri (Tüm Özellikler)
1. **Offline-first ethos**: Her özellik internet olmadan varsayılan çalışmalı; bulut yalnızca opt-in.
2. **Akademik doğrulama**: Metodolojiler (8–11) için alan uzmanı danışman şart.
3. **Geriye dönük uyumluluk**: Migration'lar opsiyonel + idempotent; eski UI çağrı noktaları forward edilmeli.
4. **Audit trail bütünlüğü**: Hedef, tüm değişikliklerin hash-chained immutable log'a yazılması. ⚠️ Mevcut audit **düz append-only dizidir** (yalnız 4 kod aksiyonu); hash-chaining henüz inşa edilmedi — PII özelliği için bir ön-koşuldur.
5. **JARS-Qual uyumu**: ICR, vaka, metodoloji raporları JARS checklist'ini otomatik beslemeli.

---

*Bu belge, QualityOpen'un mevcut kod tabanındaki somut kalıpları (`ai.ts`, `settings.store.ts`, `MediaWorkspace.tsx`, `transcriptionService.ts`, `lib.rs`'in SSRF allowlist'i, `idbStorage` persist pattern) referans alarak yazılmıştır. Her özellik uygulama-ready seviyesindedir; bir sonraki adım sprint planlaması ve detaylı task breakdown'dır.*
