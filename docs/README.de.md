# QualityOpen

> Kostenlose, Open-Source, Offline-First Plattform für die Qualitative Datenanalyse. Die ethische Alternative zu NVivo, ATLAS.ti und MAXQDA.

---

## Funktionen

- **Multimedia-Codierung** — Codieren Sie Text, PDF, Bilder und Video in einem einzigen Projekt
- **KI-gestützte Analyse** — BYOK (Bring Your Own Key): Verbinden Sie Ihre OpenAI-, Anthropic- oder Google-API-Schlüssel für Chat, Synthese und Zusammenfassung
- **Visuelle Analytik** — Thematische Netzwerke, Codematrix, DNA-Karte, Erzählfluss, Codewolke
- **8 Sprachunterstützung** — Englisch, Türkisch, Deutsch, Spanisch, Französisch, Italienisch, Portugiesisch, Niederländisch
- **QMARS-konforme Meta-Synthese** — Entspricht etablierten Berichtsstandards für qualitative Meta-Synthese
- **Umfangreiche Exportoptionen** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — Ihre Daten verlassen niemals Ihr Gerät; keine Cloud erforderlich
- **Plattformübergreifend** — Native Desktop-Apps für macOS und Windows

---

## Website

Besuchen Sie **[qualityopen.com](https://qualityopen.com)** für die neuesten Updates, Dokumentation und Community-Ressourcen.

---

## Installation

### Vorkompilierte Binärdateien herunterladen

Der einfachste Weg zum Start ist das Herunterladen einer vorkompilierten Version:

**[Von Releases herunterladen](https://github.com/YOUR_ORG/qualityopen/releases)**

Verfügbar für:
- macOS (Intel & Apple Silicon)
- Windows (x64)

### Aus dem Quellcode erstellen

Voraussetzungen:
- Node.js 20+
- pnpm
- Rust (neueste stabile Version)

```bash
# Repository klonen
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Abhängigkeiten installieren
pnpm install

# Im Entwicklungsmodus ausführen
pnpm tauri dev

# Für die Produktion erstellen
pnpm tauri build
```

---

## Technologie-Stack

| Ebene | Technologie |
|-------|------------|
| Frontend | React 19 + TypeScript (Strict-Modus) |
| Build-Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Desktop-Framework | Tauri v2 (Rust) |
| State Management | Zustand |
| Visuelle Leinwand | @xyflow/react |
| Diagramme | Recharts |

---

## Mitwirken

Wir begrüßen Beiträge von Forschern, Entwicklern und Übersetzern!

Bitte lesen Sie unsere [Mitwirkungsanleitung](CONTRIBUTING.md) für Details zu:
- Einrichtung Ihrer Entwicklungsumgebung
- Einreichen von Fehlerberichten und Feature-Anfragen
- Unserem Verhaltenskodex
- Übersetzungsrichtlinien

---

## Lizenz

Dieses Projekt ist unter der **GNU Affero General Public License v3.0 (AGPL-3.0)** lizenziert.

Den vollständigen Lizenztext finden Sie in der Datei [LICENSE](LICENSE).

---

## Danksagungen

Erbaut für Forscher, von Forschern. Inspiriert durch den Bedarf an ethischen, erschwinglichen und zugänglichen Werkzeugen für die qualitative Forschung.

Besonderer Dank an die Open-Source-Community und alle, die dazu beigetragen haben, qualitative Forschung zugänglicher zu machen.

---

## Übersetzungen

- [Englisch](README.md)
- [Türkisch](docs/README.tr.md)
- [Deutsch](docs/README.de.md)
