import { useAppStore } from "@/store/app.store";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import { de } from "@/locales/de";
import { es } from "@/locales/es";
import { nl } from "@/locales/nl";
import { fr } from "@/locales/fr";
import { it } from "@/locales/it";
import { pt } from "@/locales/pt";
import { type Language } from "@/types";

/**
 * Multi-language i18n support for QualityOpen.
 * Fallback order: Selected Language -> English -> Turkish -> Key
 */

const dictionaries: Record<Language, Record<string, string>> = {
  tr,
  en,
  de,
  es,
  nl,
  fr,
  it,
  pt,
};

// Add any missing strings directly here if needed, or better, add to tr.ts / en.ts
const extraStrings = {
  // ── Welcome Screen ──────────────────────────────────────────────────────────
  "welcome.title": { tr: "QualityOpen'a Hoş Geldiniz", en: "Welcome to QualityOpen" },
  "welcome.subtitle": { tr: "Modern ve minimalist nitel veri analiz platformu.", en: "Modern and minimalist qualitative data analysis platform." },
  "welcome.newProject": { tr: "Yeni Proje Oluştur", en: "Create New Project" },
  "welcome.openProject": { tr: "Proje Aç (Dosyadan)", en: "Open Project (From File)" },
  "welcome.browseProjects": { tr: "Projelerime Göz At", en: "Browse My Projects" },
  "welcome.hint": { tr: "İpucu: Komut paletini açmak için CMD+K tuşlarına basın.", en: "Hint: Press CMD+K to open the command palette." },
  "welcome.startReading": { tr: "Okumaya Başla", en: "Start Reading" },
  "welcome.selectDoc": { tr: "Sol panelden bir belge seçin veya yeni bir dosya yükleyin.", en: "Select a document from the left panel or upload a new file." },
  "welcome.dropFiles": { tr: "Dosyaları sürükleyip bırakın", en: "Drag and drop files" },
  "welcome.firstCode": { tr: "İlk Kodunu Yarat", en: "Create Your First Code" },
  "welcome.codeHint": { tr: "Metni seçip 'C' tuşuna basarak yeni bir kod oluşturabilirsiniz.", en: "Select text and press 'C' to create a new code." },
  // ── PDF ─────────────────────────────────────────────────────────────────────
  "pdf.loadError": { tr: "PDF dosyası yüklenemedi.", en: "Failed to load PDF file." },
  // ── Navigation ──────────────────────────────────────────────────────────────
  "nav.reflexivity": { tr: "Düşünümsellik Günlüğü", en: "Reflexivity Journal" },

  // ── Semantic Search ─────────────────────────────────────────────────────────
  "semantic.title": { tr: "Anlamsal Arama", en: "Semantic Search" },
  "semantic.settings": { tr: "Ayarlar", en: "Settings" },
  "semantic.settingsAria": { tr: "Arama ayarları", en: "Search settings" },
  "semantic.settingsTitle": { tr: "Arama ayarları — kaynak, chunk boyutu, belge indeksleme", en: "Search settings — source, chunk size, document indexing" },
  "semantic.close": { tr: "Kapat", en: "Close" },
  "semantic.embedSource": { tr: "Embedding kaynağı", en: "Embedding source" },
  "semantic.providerLocal": { tr: "Yerel", en: "Local" },
  "semantic.keyMissing": { tr: "anahtarı yok — Ayarlar > API Anahtarları", en: "key missing — Settings > API Keys" },
  "semantic.modelLabel": { tr: "Model (önerilenler)", en: "Model (recommended)" },
  "semantic.modelCustom": { tr: "özel", en: "custom" },
  "semantic.modelHelpOpenai": { tr: "OpenAI anahtarı gerektirir. -large en isabetli.", en: "Requires an OpenAI key. -large is the most accurate." },
  "semantic.modelHelpGemini": { tr: "Gemini anahtarı gerektirir.", en: "Requires a Gemini key." },
  "semantic.modelHelpLocal": { tr: "Yerel model için önce indir: ollama pull <model>. En güçlü: bge-m3.", en: "For a local model, pull it first: ollama pull <model>. Strongest: bge-m3." },
  "semantic.indexDocuments": { tr: "Belge içeriğini indeksle", en: "Index document content" },
  "semantic.indexDocumentsHelp": { tr: "Açık: tüm dosya içeriğinde ara (büyük indeks). Kapalı: yalnız kodlanmış/not segmentleri (hızlı).", en: "On: search all file content (large index). Off: only coded/note segments (fast)." },
  "semantic.chunkSize": { tr: "Chunk boyutu", en: "Chunk size" },
  "semantic.chunkSmall": { tr: "Küçük", en: "Small" },
  "semantic.chunkMedium": { tr: "Orta", en: "Medium" },
  "semantic.chunkLarge": { tr: "Büyük", en: "Large" },
  "semantic.chunkHelp": { tr: "Büyük = daha az parça, daha hızlı/hafif.", en: "Larger = fewer chunks, faster/lighter." },
  "semantic.excludeActive": { tr: "Yalnız diğer belgelerde ara", en: "Search only other documents" },
  "semantic.excludeActiveHelp": { tr: "Açık: \"Benzer bul\" aktif belgeyi atlar, eşleşmeleri diğer dosyalardan getirir.", en: "On: \"Find similar\" skips the active document and pulls matches from other files." },
  "semantic.clearIndex": { tr: "İndeksi Temizle", en: "Clear Index" },
  "semantic.clearing": { tr: "Temizleniyor…", en: "Clearing…" },
  "semantic.changeWarning": { tr: "⚠ Kaynağı, modeli veya chunk boyutunu değiştirince indeksi temizleyip yeniden indekslemelisin.", en: "⚠ After changing the source, model, or chunk size you must clear the index and re-index." },
  "semantic.searchPlaceholder": { tr: "Anlamsal ara…", en: "Semantic search…" },
  "semantic.indexed": { tr: "segment indexlendi", en: "segments indexed" },
  "semantic.indexBtn": { tr: "İndeksle", en: "Index" },
  "semantic.indexAll": { tr: "Tümünü indeksle", en: "Index all" },
  "semantic.indexRequiredTitle": { tr: "Önce indeksleme gerekli", en: "Indexing required first" },
  "semantic.indexRequiredBody": { tr: "Anlamsal arama ve “Benzer bul”, segmentleri ve belge içeriğini cihazda vektörlemeden sonuç veremez.", en: "Semantic search and “Find similar” can't return results until segments and document content are vectorized on-device." },
  "semantic.noResults": { tr: "Yeterince benzer sonuç bulunamadı.", en: "No sufficiently similar results found." },
  "semantic.embedError": { tr: "Embedding hatası", en: "Embedding error" },
  "semantic.ollamaHint": { tr: "Ollama'nın çalıştığından ve nomic-embed-text modelinin yüklü olduğundan emin olun.", en: "Make sure Ollama is running and the nomic-embed-text model is installed." },
  "semantic.noContent": { tr: "Bu projede indekslenecek içerik yok (segment veya belge).", en: "Nothing to index in this project (no segments or documents)." },
  "semantic.partialNotIndexed": { tr: "öğe daha indekslenmedi — sonuçlar eksik olabilir.", en: "more items not indexed — results may be incomplete." },
  "semantic.itemsSuffix": { tr: "öğe", en: "items" },
  "semantic.badgeSegment": { tr: "Segment", en: "Segment" },
  "semantic.badgeDocument": { tr: "Belge", en: "Document" },
  "semantic.indexCleared": { tr: "İndeks temizlendi", en: "Index cleared" },
  // Embedding model option labels (rendered via t(label as TranslationKey))
  "semantic.model.bgeM3": { tr: "bge-m3 — en güçlü yerel (çok dilli, uzun bağlam)", en: "bge-m3 — strongest local (multilingual, long context)" },
  "semantic.model.arctic2": { tr: "snowflake-arctic-embed2 — güçlü, çok dilli", en: "snowflake-arctic-embed2 — strong, multilingual" },
  "semantic.model.mxbai": { tr: "mxbai-embed-large — güçlü (İngilizce)", en: "mxbai-embed-large — strong (English)" },
  "semantic.model.nomic": { tr: "nomic-embed-text — hızlı (zayıf ayrım)", en: "nomic-embed-text — fast (weaker separation)" },
  "semantic.model.openaiLarge": { tr: "text-embedding-3-large — en iyi", en: "text-embedding-3-large — best" },
  "semantic.model.openaiSmall": { tr: "text-embedding-3-small — hızlı / ucuz", en: "text-embedding-3-small — fast / cheap" },
  "semantic.model.gemini004": { tr: "text-embedding-004 — Google", en: "text-embedding-004 — Google" },
  "semantic.model.geminiNew": { tr: "gemini-embedding-001 — yeni", en: "gemini-embedding-001 — new" },

  // ── Notes Panel ─────────────────────────────────────────────────────────────
  "notes.title": { tr: "Notlar", en: "Notes" },
  "notes.empty": { tr: "Henüz not yok", en: "No notes yet" },
  "notes.close": { tr: "Kapat", en: "Close" },
  "notes.labelNote": { tr: "Not", en: "Note" },
  "notes.labelCode": { tr: "Kod", en: "Code" },

  // ── Local AI Panel ──────────────────────────────────────────────────────────
  "localai.statusConnected": { tr: "Bağlandı", en: "Connected" },
  "localai.statusDegraded": { tr: "Düşük performans", en: "Degraded" },
  "localai.statusUnreachable": { tr: "Erişilemiyor", en: "Not reachable" },
  "localai.statusChecking": { tr: "Kontrol ediliyor…", en: "Checking…" },
  "localai.refresh": { tr: "Yenile", en: "Refresh" },
  "localai.unreachableWarning": { tr: "Ollama bu adreste bulunamadı. Kurulu ve çalışır olduğundan emin olun (ollama serve). Aşağıdaki kurulum kılavuzuna bakın.", en: "Couldn't reach Ollama at this address. Make sure it's installed and running (ollama serve). See the setup guide below." },
  "localai.baseUrl": { tr: "Temel URL", en: "Base URL" },
  "localai.activeModel": { tr: "Aktif model", en: "Active model" },
  "localai.noModels": { tr: "Model bulunamadı — `ollama pull` ile bir tane indirin", en: "No models found — pull one with `ollama pull`" },
  "localai.connectedNoModels": { tr: "Bağlandı, ancak henüz model yüklü değil. Şunu çalıştırın:", en: "Connected, but no models are installed yet. Run" },
  "localai.setupGuide": { tr: "Kurulum kılavuzu", en: "Setup guide" },
  "localai.windowsInstall": { tr: "İndirin ve yükleyiciyi şuradan çalıştırın:", en: "Download and run the installer from" },
  "localai.pullModel": { tr: "Bir model indir", en: "Pull a model" },

  // ── i18n sweep: previously-hardcoded UI strings ──────────────────────────────
  "right.changeColor": { tr: "Renk değiştir", en: "Change color" },
  "right.markNormal": { tr: "Normal Kanıt Olarak İşaretle", en: "Mark as Normal Evidence" },
  "right.markDisconfirming": { tr: "Zıt Kanıt (Disconfirming)", en: "Disconfirming Evidence" },
  "right.disconfirmPlaceholder": { tr: "Neden zıt kanıt? (Örn: Katılımcı burada genel eğilimin aksine...)", en: "Why disconfirming? (e.g. the participant here contradicts the general trend…)" },
  "image.zoomIn": { tr: "Yakınlaştır (scroll)", en: "Zoom in (scroll)" },
  "image.zoomOut": { tr: "Uzaklaştır", en: "Zoom out" },
  "image.reset": { tr: "Sıfırla", en: "Reset" },
  "pdf.ocrRunning": { tr: "OCR işleniyor…", en: "Running OCR…" },
  "pdf.ocrHint": { tr: "Metne çevirerek üzerinde kodlama yapabilirsiniz.", en: "Convert it to text to code on it." },
  "pdf.scannedDetected": { tr: "Taranmış belge algılandı", en: "Scanned document detected" },
  "pdf.startOcr": { tr: "OCR Başlat", en: "Run OCR" },
  "map.viewportNotFound": { tr: "Harita alanı bulunamadı.", en: "Map viewport not found." },
  "graph.noSelection": { tr: "Seçim yok…", en: "No selection…" },
  "saturation.noteLabel": { tr: "Analiz Notu:", en: "Analysis Note:" },
  "saturation.note": { tr: "Yeni kod keşif oranı %10'un altına düştüğünde genellikle teorik doygunluğa ulaşıldığı kabul edilir.", en: "When the new-code discovery rate drops below 10%, theoretical saturation is generally considered reached." },
  "saturation.cumulative": { tr: "Kümülatif", en: "Cumulative" },
  "offline.badge": { tr: "Çevrimdışı", en: "Offline" },
  "settings.deleteKey": { tr: "Anahtarı sil", en: "Delete key" },
  "synthesis.placeholder": { tr: "Analiz özetini buraya yazın veya AI ile oluşturun...", en: "Write the analysis summary here, or generate it with AI…" },
  "qmars.synthesize": { tr: "Sentez Oluştur (AI)", en: "Generate Synthesis (AI)" },
  "qmars.resynthesize": { tr: "Yeniden Sentezle (AI)", en: "Re-synthesize (AI)" },
  "qmars.title": { tr: "QMARS Sentez Tablosu", en: "QMARS Synthesis Table" },
  "qmars.theme": { tr: "Tema (Kod)", en: "Theme (Code)" },
  "qmars.subtitle": { tr: "Nitel meta-sentez çalışmaları için tema bazlı bulgu sentezi.", en: "Theme-based finding synthesis for qualitative meta-synthesis studies." },
  "qmars.downloadHtml": { tr: "Tabloyu İndir (HTML)", en: "Download Table (HTML)" },
  "qmars.studyCount": { tr: "Çalışma Sayısı (k)", en: "Study Count (k)" },
  "qmars.synthesizedFinding": { tr: "Sentezlenmiş Bulgu (Synthesized Finding)", en: "Synthesized Finding" },
  "qmars.notSynthesizedYet": { tr: "Bu tema için henüz meta-sentez oluşturulmadı.", en: "No meta-synthesis has been generated for this theme yet." },
  "qmars.noCodes": { tr: "Henüz kod oluşturulmamış.", en: "No codes have been created yet." },
  "qmars.exportHeading": { tr: "Nitel Meta-Sentez (QMARS) Tema Sentez Tablosu", en: "Qualitative Meta-Synthesis (QMARS) Theme Synthesis Table" },
  "qmars.exportIntro": { tr: "Bu tablo APA JARS standartlarına uygun olarak meta-sentez bulgularını özetlemektedir.", en: "This table summarizes meta-synthesis findings in accordance with APA JARS standards." },
  "qmars.exportStudyCount": { tr: "Birincil Çalışma Sayısı (k)", en: "Primary Study Count (k)" },
  "qmars.notSynthesizedShort": { tr: "Henüz sentezlenmedi.", en: "Not synthesized yet." },
  "cmd.semanticSearchDesc": { tr: "Segmentlerde anlam tabanlı arama yap", en: "Meaning-based search across segments" },

  // ── Privacy Badge ───────────────────────────────────────────────────────────
  "privacy.compact": { tr: "%100 cihazınızda", en: "100% on-device" },
  "privacy.full": { tr: "%100 cihazınızda çalışıyor — veriler bilgisayarınızdan çıkmaz", en: "Running 100% on-device — data never leaves your computer" },

  // ── Context Code Menu ───────────────────────────────────────────────────────
  "codeMenu.assign": { tr: "Kod Ata", en: "Assign Code" },
  "codeMenu.searchPlaceholder": { tr: "Kod ara…", en: "Search codes…" },
  "codeMenu.notFoundPrefix": { tr: "bulunamadı", en: "not found" },
  "codeMenu.empty": { tr: "Henüz kod yok", en: "No codes yet" },
  "codeMenu.namePlaceholder": { tr: "Kod adı…", en: "Code name…" },
  "codeMenu.create": { tr: "Yeni Kod Oluştur", en: "Create New Code" },

  // ── Import Progress ─────────────────────────────────────────────────────────
  "import.importing": { tr: "İçe aktarılıyor:", en: "Importing:" },
  "import.processing": { tr: "Dosya işleniyor…", en: "Processing file…" },

  // ── Filter Bar ──────────────────────────────────────────────────────────────
  "filter.opEquals": { tr: "Eşittir", en: "Equals" },
  "filter.opNotEquals": { tr: "Eşit Değil", en: "Not equal" },
  "filter.opContains": { tr: "İçerir", en: "Contains" },
  "filter.add": { tr: "Filtre Ekle", en: "Add Filter" },
  "filter.selectField": { tr: "Alan Seç", en: "Select Field" },
  "filter.condition": { tr: "Koşul", en: "Condition" },
  "filter.value": { tr: "Değer", en: "Value" },
  "filter.noOptions": { tr: "Seçenek yok", en: "No options" },
  "filter.clear": { tr: "Temizle", en: "Clear" },

  // ── Document Header ─────────────────────────────────────────────────────────
  "docHeader.participantContext": { tr: "Katılımcı Bağlamı", en: "Participant Context" },
};

// Flatten extra strings into dictionaries
Object.entries(extraStrings).forEach(([key, value]) => {
  dictionaries.tr[key] = value.tr;
  dictionaries.en[key] = value.en;
  // Fallback existing extra strings to English for new languages if not provided
  ["de", "es", "nl", "fr", "it", "pt"].forEach((l) => {
    dictionaries[l as Language][key] = value.en;
  });
});

export type TranslationKey = keyof typeof tr | keyof typeof extraStrings;

export function t(key: string, lang: Language): string {
  return (
    dictionaries[lang]?.[key] ??
    dictionaries["en"]?.[key] ??
    dictionaries["tr"]?.[key] ??
    key
  );
}

/**
 * Hook for using translations in components.
 */
export function useT() {
  const language = useAppStore((s) => s.language);
  return (key: TranslationKey) => t(key, language);
}
