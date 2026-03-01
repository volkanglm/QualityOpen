import { useCallback } from "react";
import { useAppStore } from "@/store/app.store";
import { t, type TranslationKey } from "@/lib/i18n";

/** Returns a translation function bound to the current language. */
export function useT() {
  const language = useAppStore((s) => s.language);
  return useCallback((key: TranslationKey) => t(key, language), [language]);
}
