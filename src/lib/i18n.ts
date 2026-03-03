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
  "welcome.openProject": { tr: "Proje Aç", en: "Open Project" },
  "welcome.hint": { tr: "İpucu: Komut paletini açmak için CMD+K tuşlarına basın.", en: "Hint: Press CMD+K to open the command palette." },
  "welcome.startReading": { tr: "Okumaya Başla", en: "Start Reading" },
  "welcome.selectDoc": { tr: "Sol panelden bir belge seçin veya yeni bir dosya yükleyin.", en: "Select a document from the left panel or upload a new file." },
  "welcome.dropFiles": { tr: "Dosyaları sürükleyip bırakın", en: "Drag and drop files" },
  "welcome.firstCode": { tr: "İlk Kodunu Yarat", en: "Create Your First Code" },
  "welcome.codeHint": { tr: "Metni seçip 'C' tuşuna basarak yeni bir kod oluşturabilirsiniz.", en: "Select text and press 'C' to create a new code." },
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
