# QualityOpen

> Free, open-source, offline-first Qualitative Data Analysis platform. The ethical alternative to NVivo, ATLAS.ti, and MAXQDA.

---

## Features

- **Multi-media coding** — Code Text, PDF, Images, and Video within a single project
- **AI-assisted analysis** — BYOK (Bring Your Own API Key): connect your OpenAI, Anthropic, or Google API keys for chat, synthesis, and summarization
- **Visual analytics** — Thematic Networks, Code Matrix, DNA Map, Narrative Flow, Code Cloud
- **8 language support** — English, Turkish, German, Spanish, French, Italian, Portuguese, Dutch
- **QMARS-compliant meta-synthesis** — Follows established qualitative meta-synthesis reporting standards
- **Rich export options** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — Your data never leaves your device; no cloud required
- **Cross-platform** — Native desktop apps for macOS & Windows

---

## Screenshots

### Project Dashboard
*Overview of documents, codes, and analysis progress.*

![Dashboard](docs/screenshots/dashboard.png)

### Document Coding Interface
*Select text, images, or video segments and assign codes.*

![Coding](docs/screenshots/coding.png)

### Visual Analytics — Thematic Network
*Explore relationships between codes and themes interactively.*

![Thematic Network](docs/screenshots/thematic-network.png)

### AI Analysis Assistant
*Chat with your data using your own API key.*

![AI Assistant](docs/screenshots/ai-assistant.png)

### Export & Reporting
*Generate publication-ready reports in APA 7 format.*

![Export](docs/screenshots/export.png)

---

## Installation

### Download Pre-built Binaries

The easiest way to get started is to download a pre-built release:

**[Download from Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Available for:
- macOS (Intel & Apple Silicon)
- Windows (x64)

### Build from Source

Requirements:
- Node.js 20+
- pnpm
- Rust (latest stable)

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript (strict mode) |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Desktop Framework | Tauri v2 (Rust) |
| State Management | Zustand |
| Visual Canvas | @xyflow/react |
| Charts | Recharts |

---

## Contributing

We welcome contributions from researchers, developers, and translators!

Please read our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up your development environment
- Submitting bug reports and feature requests
- Our code of conduct
- Translation guidelines

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [LICENSE](LICENSE) for the full license text.

---

## Acknowledgments

Built for researchers, by researchers. Inspired by the need for ethical, affordable, and accessible qualitative research tools.

Special thanks to the open-source community and everyone who has contributed to making qualitative research more accessible.

---

## Translations

- [English](README.md)
- [Turkish / Türkçe](docs/README.tr.md)
- [German / Deutsch](docs/README.de.md)
- [Spanish / Español](docs/README.es.md)
- [French / Français](docs/README.fr.md)
- [Italian / Italiano](docs/README.it.md)
- [Portuguese / Português](docs/README.pt.md)
- [Dutch / Nederlands](docs/README.nl.md)
