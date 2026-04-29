# QualityOpen

> Gratis, open-source en offline-first platform voor Kwalitatieve Data-analyse. Het ethische alternatief voor NVivo, ATLAS.ti en MAXQDA.

---

## Functies

- **Multimediale codering** — Codeer Tekst, PDF, Afbeeldingen en Video binnen een enkel project
- **AI-ondersteunde analyse** — BYOK (Bring Your Own Key): verbind uw eigen OpenAI-, Anthropic- of Google API-sleutels voor chat, synthese en samenvatting
- **Visuele analytics** — Thematische Netwerken, Code Matrix, DNA-kaart, Narratieve Stroom, Codewolk
- **8-talige ondersteuning** — Engels, Turks, Duits, Spaans, Frans, Italiaans, Portugees, Nederlands
- **QMARS-conforme meta-synthese** — Volgt de vastgestelde rapportagestandaarden voor kwalitatieve meta-synthese
- **Uitgebreide exportopties** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — Uw gegevens verlaten nooit uw apparaat; geen cloud nodig
- **Cross-platform** — Native desktop-apps voor macOS en Windows

---

## Schermafbeeldingen

### Projectdashboard
*Overzicht van documenten, codes en analysevoortgang.*

![Dashboard](docs/screenshots/dashboard.png)

### Documentcodering-interface
*Selecteer tekst-, afbeelding- of videosegmenten en wijs codes toe.*

![Coding](docs/screenshots/coding.png)

### Visuele analytics — Thematisch Netwerk
*Verken interactief de relaties tussen codes en thema's.*

![Thematic Network](docs/screenshots/thematic-network.png)

### AI-analyseassistent
*Chat met uw gegevens met behulp van uw eigen API-sleutel.*

![AI Assistant](docs/screenshots/ai-assistant.png)

### Exporteren en rapporteren
*Genereer publicatieklaar rapporten in APA 7-formaat.*

![Export](docs/screenshots/export.png)

---

## Installatie

### Vooraf gecompileerde binaire bestanden downloaden

De eenvoudigste manier om te beginnen is door een vooraf gecompileerde versie te downloaden:

**[Downloaden van Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Beschikbaar voor:
- macOS (Intel en Apple Silicon)
- Windows (x64)

### Bouwen vanuit broncode

Vereisten:
- Node.js 20+
- pnpm
- Rust (laatste stabiele versie)

```bash
# Kloon de repository
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Installeer afhankelijkheden
pnpm install

# Voer uit in ontwikkelmodus
pnpm tauri dev

# Bouwen voor productie
pnpm tauri build
```

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend | React 19 + TypeScript (strict mode) |
| Build-tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Desktop-framework | Tauri v2 (Rust) |
| State Management | Zustand |
| Visueel canvas | @xyflow/react |
| Grafieken | Recharts |

---

## Bijdragen

We verwelkomen bijdragen van onderzoekers, ontwikkelaars en vertalers!

Lees onze [Bijdragengids](CONTRIBUTING.md) voor details over:
- Het opzetten van uw ontwikkelomgeving
- Het indienen van bugrapporten en functieverzoeken
- Onze gedragscode
- Vertaalrichtlijnen

---

## Licentie

Dit project is gelicenseerd onder de **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Zie [LICENSE](LICENSE) voor de volledige licentietekst.

---

## Dankwoord

Gebouwd voor onderzoekers, door onderzoekers. Geïnspireerd door de behoefte aan ethische, betaalbare en toegankelijke tools voor kwalitatief onderzoek.

Speciale dank aan de open-sourcegemeenschap en iedereen die heeft bijgedragen aan het toegankelijker maken van kwalitatief onderzoek.

---

## Vertalingen

- [Engels / English](README.md)
- [Turks / Türkçe](docs/README.tr.md)
- [Duits / Deutsch](docs/README.de.md)
- [Spaans / Español](docs/README.es.md)
- [Frans / Français](docs/README.fr.md)
- [Italiaans / Italiano](docs/README.it.md)
- [Portugees / Português](docs/README.pt.md)
- [Nederlands](docs/README.nl.md)
