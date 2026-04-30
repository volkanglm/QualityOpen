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

## Website

Visit **[qualityopen.com](https://qualityopen.com)** for the latest updates, documentation, and community resources.

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

### Copyleft Protection

This software is **copyleft**: you are free to use, study, modify, and redistribute it — but any modified version distributed to others (including over a network) must also be released under AGPL-3.0 with full source code.

**You may not:**
- Take this code, modify it, and sell it as a closed-source commercial product.
- Remove or bypass this license when redistributing.
- Use it in proprietary software without releasing your source code.
- Redistribute without including the complete corresponding source code.

AGPL-3.0 ensures the software remains forever free and open for the research community. Any derivative work, even when accessed over a network, must share its source code. This prevents anyone from taking the software, improving it, and offering it as a proprietary service without giving back.

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
