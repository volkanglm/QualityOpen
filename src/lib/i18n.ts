/**
 * Minimal i18n — Turkish (default) + English translations.
 * Usage:  const t = useT();  t("coding.assign")
 */

export type Language = "tr" | "en";

const translations = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  "nav.documents": { tr: "Belgeler", en: "Documents" },
  "nav.coding": { tr: "Kodlama", en: "Coding" },
  "nav.analysis": { tr: "Dashboard", en: "Dashboard" },
  "nav.memos": { tr: "Notlar", en: "Memos" },
  "nav.settings": { tr: "Ayarlar", en: "Settings" },

  // ── Left panel ──────────────────────────────────────────────────────────────
  "left.projects": { tr: "Projeler", en: "Projects" },
  "left.newProject": { tr: "Yeni Proje", en: "New Project" },
  "left.documents": { tr: "Belgeler", en: "Documents" },
  "left.newDocument": { tr: "Yeni Belge", en: "New Document" },
  "left.noProjects": { tr: "Proje yok", en: "No projects" },
  "left.noDocuments": { tr: "Belge yok", en: "No documents" },
  "left.deleteProject": { tr: "Projeyi sil", en: "Delete project" },
  "left.deleteDocument": { tr: "Belgeyi sil", en: "Delete document" },
  "left.rename": { tr: "Yeniden adlandır", en: "Rename" },

  // ── Right panel (code system) ────────────────────────────────────────────────
  "right.codeSystem": { tr: "Kod Sistemi", en: "Code System" },
  "right.newCode": { tr: "Yeni Kod", en: "New Code" },
  "right.noCodesHint": { tr: "Henüz kod yok. Metni seçip bir kod oluşturun.", en: "No codes yet. Select text to create one." },
  "right.addSubCode": { tr: "Alt-kod ekle", en: "Add sub-code" },
  "right.rename": { tr: "Yeniden adlandır", en: "Rename" },
  "right.delete": { tr: "Sil", en: "Delete" },
  "right.clickHint": { tr: "Tıkla: segmentleri görüntüle · Çift tıkla: adlandır", en: "Click: view segments · Double-click: rename" },
  "right.subCodeModal": { tr: "Alt Kod Ekle", en: "Add Sub-Code" },
  "right.subCodeOf": { tr: "Üst kod:", en: "Parent code:" },

  // ── Center panel ────────────────────────────────────────────────────────────
  "center.edit": { tr: "Düzenle", en: "Edit" },
  "center.done": { tr: "Tamam", en: "Done" },
  "center.import": { tr: "İçe Aktar", en: "Import" },
  "center.search": { tr: "Ara", en: "Search" },
  "center.chat": { tr: "Sohbet", en: "Chat" },
  "center.docNote": { tr: "Belge Notu", en: "Document Note" },
  "center.addNote": { tr: "Belge notu ekle…", en: "Add document note…" },
  "center.words": { tr: "kelime", en: "words" },
  "center.coded": { tr: "kodlama", en: "coded" },
  "center.searchPlaceholder": { tr: "Metin içinde ara…", en: "Search in text…" },
  "center.importing": { tr: "İçe aktarılıyor…", en: "Importing…" },
  "center.summarizing": { tr: "AI özetleniyor…", en: "Summarizing with AI…" },
  "center.noDoc": { tr: "Belge açık değil", en: "No document open" },
  "center.dropHint": { tr: "Dosyayı bırakın", en: "Drop file here" },

  // ── Floating menu ────────────────────────────────────────────────────────────
  "float.assign": { tr: "Kod Ata", en: "Assign" },
  "float.highlight": { tr: "Vurgula", en: "Highlight" },
  "float.summarize": { tr: "Özetle", en: "Summarize" },
  "float.askAi": { tr: "AI'ya Sor", en: "Ask AI" },

  // ── Analysis ─────────────────────────────────────────────────────────────────
  "analysis.title": { tr: "Dashboard / Görsel Araçlar", en: "Dashboard / Visual Tools" },
  "analysis.noProject": { tr: "Proje seçilmedi", en: "No project selected" },
  "analysis.noCodes": { tr: "Henüz kod yok", en: "No codes yet" },
  "analysis.frequency": { tr: "Kod Frekansı", en: "Code Frequency" },
  "analysis.coverage": { tr: "Belge Kapsamı", en: "Document Coverage" },
  "analysis.export": { tr: "Dışa Aktar", en: "Export" },
  "analysis.segments": { tr: "segment", en: "segments" },
  "analysis.docs": { tr: "belge", en: "documents" },
  "analysis.codes": { tr: "kod", en: "codes" },
  "analysis.overview": { tr: "Genel Bakış", en: "Overview" },
  "analysis.cloud": { tr: "Kod Bulutu", en: "Code Cloud" },
  "analysis.matrix": { tr: "Matris", en: "Matrix" },
  "analysis.network": { tr: "Ağ Haritası", en: "Network Graph" },
  "analysis.cloudDesc": { tr: "Kodların segment sayısına göre boyutlandırılmış görünümü", en: "Visualization of codes sized by segment count" },
  "analysis.matrixDesc": { tr: "Her belgede hangi kodların ne sıklıkla kullanıldığı", en: "Frequency of codes used in each document" },
  "analysis.networkDesc": { tr: "Birlikte kullanılan kodlar arasındaki ilişki haritası", en: "Map of relationships between co-occurring codes" },
  "analysis.distribution": { tr: "Kod Dağılımı", en: "Code Distribution" },
  "analysis.total": { tr: "toplam", en: "total" },
  "analysis.noData": { tr: "Veri yok", en: "No data" },
  "analysis.noApplied": { tr: "Henüz kod uygulanmadı.", en: "No codes applied yet." },
  "analysis.exportSoon": { tr: "Dışa aktar (yakında)", en: "Export (coming soon)" },
  "analysis.sortedBy": { tr: "segment sayısına göre sıralı", en: "sorted by segment count" },

  // ── Settings ─────────────────────────────────────────────────────────────────
  "settings.title": { tr: "Ayarlar", en: "Settings" },
  "settings.subtitle": { tr: "Uygulama tercihleri ve API entegrasyonları", en: "App preferences and API integrations" },
  "settings.aiSection": { tr: "AI Entegrasyonu", en: "AI Integration" },
  "settings.aiSubtitle": { tr: "Tematik kodlama için API anahtarı", en: "API key for thematic coding" },
  "settings.save": { tr: "Kaydet", en: "Save" },
  "settings.saved": { tr: "Kaydedildi", en: "Saved" },
  "settings.clearAll": { tr: "Tüm anahtarları sil", en: "Clear all keys" },
  "settings.defaultProv": { tr: "Varsayılan sağlayıcı", en: "Default provider" },
  "settings.defaultDesc": { tr: "Birden fazla anahtar varken hangisi kullanılsın", en: "Which provider to use when multiple keys are set" },
  "settings.auto": { tr: "Oto", en: "Auto" },
  "settings.connected": { tr: "bağlı", en: "connected" },
  "settings.appearance": { tr: "Görünüm", en: "Appearance" },
  "settings.theme": { tr: "Tema", en: "Theme" },
  "settings.themeDesc": { tr: "Arayüz renk şeması", en: "UI color scheme" },
  "settings.dark": { tr: "Koyu", en: "Dark" },
  "settings.light": { tr: "Açık", en: "Light" },
  "settings.language": { tr: "Dil / Language", en: "Language" },
  "settings.langDesc": { tr: "Arayüz dili", en: "Interface language" },
  "settings.keyHint": { tr: "Anahtar, yerel depolamada şifrelenmiş olarak saklanır. Hiçbir zaman sunucuya gönderilmez.", en: "Key is stored encrypted in local storage. Never sent to a server." },
  "settings.about": { tr: "Hakkında", en: "About" },

  // ── Memos ────────────────────────────────────────────────────────────────────
  "memos.title": { tr: "Notlar", en: "Memos" },
  "memos.new": { tr: "Yeni Not", en: "New Memo" },
  "memos.noMemos": { tr: "Henüz not yok", en: "No memos yet" },
  "memos.placeholder": { tr: "Not içeriği…", en: "Memo content…" },
  "memos.delete": { tr: "Sil", en: "Delete" },

  // ── Retrieval view ──────────────────────────────────────────────────────────
  "retrieval.back": { tr: "Geri", en: "Back" },
  "retrieval.noSegs": { tr: "Bu koda atanmış segment yok.", en: "No segments assigned to this code." },
  "retrieval.unknown": { tr: "Bilinmeyen belge", en: "Unknown document" },

  // ── AI Chat ─────────────────────────────────────────────────────────────────
  "chat.title": { tr: "Belgelerle Sohbet", en: "Chat with Documents" },
  "chat.clear": { tr: "Temizle", en: "Clear" },
  "chat.clearTitle": { tr: "Sohbeti temizle", en: "Clear chat" },
  "chat.placeholder": { tr: "Belge hakkında soru sor…", en: "Ask a question…" },
  "chat.welcome": { tr: "Aktif belgeyi bağlam olarak kullanarak\nsoru sorabilirsiniz.", en: "You can ask questions using the\nactive document as context." },
  "chat.errorKey": { tr: "Ayarlar > API Anahtarları'ndan bir AI anahtarı ekleyin.", en: "Add an AI key in Settings > API Keys." },
  "chat.systemPrompt": {
    tr: "Sen nitel araştırma verisi analizi konusunda uzman bir yardımcısın.\nAşağıda araştırmacının çalıştığı belge ve kodlanmış segmentler verilmiştir.\nBu bağlamı kullanarak araştırmacının sorularını Türkçe olarak yanıtla.\nKısa, analitik ve akademik bir dil kullan.",
    en: "You are an expert assistant in qualitative research data analysis.\nBelow are the document and coded segments the researcher is working on.\nUse this context to answer the researcher's questions in English.\nUse concise, analytical, and academic language."
  },
  "chat.contextLabel": { tr: "Bağlam:", en: "Context:" },
  "chat.noContext": { tr: "Bağlam bulunmuyor.", en: "No context found." },

  "common.active": { tr: "Aktif", en: "Active" },
  "common.viewSegments": { tr: "Segmentleri Görüntüle", en: "View Segments" },
  "common.color": { tr: "Renk", en: "Color" },
  "common.export": { tr: "Dışa Aktar", en: "Export" },
  "common.import": { tr: "İçe Aktar", en: "Import" },
  "common.save": { tr: "Kaydet", en: "Save" },
  "common.cancel": { tr: "İptal", en: "Cancel" },
  "common.delete": { tr: "Sil", en: "Delete" },
  "common.rename": { tr: "Yeniden Adlandır", en: "Rename" },
  "common.create": { tr: "Oluştur", en: "Create" },
  "common.newProject": { tr: "Yeni Proje", en: "New Project" },
  "common.newDocument": { tr: "Yeni Belge", en: "New Document" },
  "common.projectName": { tr: "Proje İsmi", en: "Project Name" },
  "common.docName": { tr: "Belge İsmi", en: "Document Name" },
  "common.type": { tr: "Tür", en: "Type" },
  "common.close": { tr: "Kapat", en: "Close" },
  "common.name": { tr: "İsim", en: "Name" },
  "common.loading": { tr: "Yükleniyor…", en: "Loading…" },
  "common.error": { tr: "Hata", en: "Error" },
  "common.upload": { tr: "Yükle", en: "Upload" },
  "common.dropFile": { tr: "Dosyayı buraya bırakın", en: "Drop file here" },

  "settings.dataManagement": { tr: "Veri Yönetimi", en: "Data Management" },
  "settings.dataSubtitle": { tr: "Projeleri dışa/içe aktar ve yedekle", en: "Export/import and backup projects" },
  "settings.exportBackup": { tr: "Yedek Dışa Aktar", en: "Export Backup" },
  "settings.exportDesc": { tr: "Tüm proje verilerini JSON dosyası olarak indir", en: "Download all projects as JSON" },
  "settings.importFile": { tr: "Dosyadan İçe Aktar", en: "Import from File" },
  "settings.importDesc": { tr: "JSON yedek dosyasını yükle", en: "Load a JSON backup file" },
  "settings.localSync": { tr: "Yerel Klasör Yedekleme", en: "Local Folder Sync" },
  "settings.localSubtitle": { tr: "Çalışmalarını bilgisayarındaki bir klasöre yedekle", en: "Backup work to a local folder" },
  "settings.selectFolder": { tr: "Klasör Seç", en: "Select Folder" },
  "settings.changeFolder": { tr: "Klasörü Değiştir", en: "Change Folder" },
  "settings.syncCenter": { tr: "Senkronizasyon Merkezi", en: "Sync Center" },
  "settings.noFolder": { tr: "Henüz bir klasör seçilmedi.", en: "No folder selected." },
  "settings.premium": { tr: "PREMIUM", en: "PREMIUM" },
  "settings.aboutDesc": { tr: "Araştırmacılar ve akademisyenler için modern, minimalist nitel veri analiz aracı.", en: "Modern, minimalist QDA tool for researchers." },
} satisfies Record<string, { tr: string; en: string }>;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] ?? translations[key]?.["tr"] ?? key;
}

/**
 * Hook for using translations in components.
 */
export function useT() {
  const { language } = useAppStore.getState();
  return (key: TranslationKey) => t(key, language);
}

import { useAppStore } from "@/store/app.store";
