import { describe, it, expect } from "vitest";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import { de } from "@/locales/de";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it as itLocale } from "@/locales/it";
import { nl } from "@/locales/nl";
import { pt } from "@/locales/pt";

const locales: Record<string, Record<string, string>> = {
  tr,
  en,
  de,
  es,
  fr,
  it: itLocale,
  nl,
  pt,
};

const referenceKeys = new Set(Object.keys(en));

describe("i18n locale completeness", () => {
  // Every locale must have all English keys (EN is the reference/fallback)
  for (const [lang, dict] of Object.entries(locales)) {
    if (lang === "en") continue;

    it(`${lang}: contains all English keys`, () => {
      const missing = [...referenceKeys].filter((k) => !(k in dict));
      expect(missing, `Missing keys in '${lang}': ${missing.join(", ")}`).toHaveLength(0);
    });
  }

  // No locale should have keys that English doesn't have (orphan keys)
  for (const [lang, dict] of Object.entries(locales)) {
    if (lang === "en") continue;

    it(`${lang}: has no orphan keys absent from English`, () => {
      const orphans = Object.keys(dict).filter((k) => !referenceKeys.has(k));
      expect(orphans, `Orphan keys in '${lang}': ${orphans.join(", ")}`).toHaveLength(0);
    });
  }

  // All values must be non-empty strings
  for (const [lang, dict] of Object.entries(locales)) {
    it(`${lang}: all values are non-empty strings`, () => {
      const empty = Object.entries(dict)
        .filter(([, v]) => typeof v !== "string" || v.trim() === "")
        .map(([k]) => k);
      expect(empty, `Empty values in '${lang}': ${empty.join(", ")}`).toHaveLength(0);
    });
  }
});
