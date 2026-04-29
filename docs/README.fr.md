# QualityOpen

> Plateforme gratuite, open-source et offline-first d'Analyse de Données Qualitatives. L'alternative éthique à NVivo, ATLAS.ti et MAXQDA.

---

## Fonctionnalités

- **Codage multimédia** — Codez du Texte, des PDF, des Images et des Vidéos au sein d'un seul projet
- **Analyse assistée par IA** — BYOK (Bring Your Own Key) : connectez vos clés API OpenAI, Anthropic ou Google pour le chat, la synthèse et le résumé
- **Analytique visuelle** — Réseaux Thématiques, Matrice de Codes, Carte ADN, Flux Narratif, Nuage de Codes
- **Prise en charge de 8 langues** — Anglais, Turc, Allemand, Espagnol, Français, Italien, Portugais, Néerlandais
- **Méta-synthèse conforme à QMARS** — Respecte les normes établies de rapport de méta-synthèse qualitative
- **Options d'exportation riches** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100 % hors ligne** — Vos données ne quittent jamais votre appareil ; aucun cloud requis
- **Multiplateforme** — Applications de bureau natives pour macOS et Windows

---

## Captures d'écran

### Tableau de bord du projet
*Vue d'ensemble des documents, des codes et de la progression de l'analyse.*

![Dashboard](docs/screenshots/dashboard.png)

### Interface de codage de documents
*Sélectionnez des segments de texte, d'image ou de vidéo et attribuez des codes.*

![Coding](docs/screenshots/coding.png)

### Analytique visuelle — Réseau Thématique
*Explorez interactivement les relations entre les codes et les thèmes.*

![Thematic Network](docs/screenshots/thematic-network.png)

### Assistant d'analyse IA
*Discutez avec vos données en utilisant votre propre clé API.*

![AI Assistant](docs/screenshots/ai-assistant.png)

### Exportation et rapports
*Générez des rapports prêts pour la publication au format APA 7.*

![Export](docs/screenshots/export.png)

---

## Installation

### Télécharger les binaires précompilés

Le moyen le plus simple de commencer est de télécharger une version précompilée :

**[Télécharger depuis les Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Disponible pour :
- macOS (Intel et Apple Silicon)
- Windows (x64)

### Compiler à partir des sources

Prérequis :
- Node.js 20+
- pnpm
- Rust (dernière version stable)

```bash
# Cloner le dépôt
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Installer les dépendances
pnpm install

# Exécuter en mode développement
pnpm tauri dev

# Compiler pour la production
pnpm tauri build
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript (mode strict) |
| Outil de compilation | Vite 7 |
| Style | Tailwind CSS v4 |
| Framework bureau | Tauri v2 (Rust) |
| Gestion d'état | Zustand |
| Canevas visuel | @xyflow/react |
| Graphiques | Recharts |

---

## Contribuer

Nous accueillons favorablement les contributions de chercheurs, développeurs et traducteurs !

Veuillez consulter notre [Guide de contribution](CONTRIBUTING.md) pour plus de détails sur :
- La configuration de votre environnement de développement
- L'envoi de rapports de bogues et de demandes de fonctionnalités
- Notre code de conduite
- Les directives de traduction

---

## Licence

Ce projet est sous licence **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Consultez [LICENSE](LICENSE) pour le texte complet de la licence.

---

## Remerciements

Conçu pour les chercheurs, par des chercheurs. Inspiré par le besoin d'outils de recherche qualitative éthiques, abordables et accessibles.

Un remerciement particulier à la communauté open-source et à tous ceux qui ont contribué à rendre la recherche qualitative plus accessible.

---

## Traductions

- [Anglais / English](README.md)
- [Turc / Türkçe](docs/README.tr.md)
- [Allemand / Deutsch](docs/README.de.md)
- [Espagnol / Español](docs/README.es.md)
- [Français](docs/README.fr.md)
- [Italien / Italiano](docs/README.it.md)
- [Portugais / Português](docs/README.pt.md)
- [Néerlandais / Nederlands](docs/README.nl.md)
