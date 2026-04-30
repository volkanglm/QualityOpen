# QualityOpen

> Plataforma gratuita, open-source e offline-first para Análise de Dados Qualitativos. A alternativa ética ao NVivo, ATLAS.ti e MAXQDA.

---

## Funcionalidades

- **Codificação multimídia** — Codifique Texto, PDF, Imagens e Vídeo dentro de um único projeto
- **Análise assistida por IA** — BYOK (Bring Your Own Key): conecte suas chaves de API da OpenAI, Anthropic ou Google para chat, síntese e resumo
- **Analítica visual** — Redes Temáticas, Matriz de Códigos, Mapa de DNA, Fluxo Narrativo, Nuvem de Códigos
- **Suporte em 8 idiomas** — Inglês, Turco, Alemão, Espanhol, Francês, Italiano, Português, Holandês
- **Meta-síntese compatível com QMARS** — Segue os padrões estabelecidos de relatório de meta-síntese qualitativa
- **Opções de exportação avançadas** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — Seus dados nunca saem do seu dispositivo; nuvem não necessária
- **Multiplataforma** — Aplicativos de desktop nativos para macOS e Windows

---

## Site

Visite **[qualityopen.com](https://qualityopen.com)** para obter as últimas atualizações, documentação e recursos da comunidade.

---

## Instalação

### Baixar binários pré-compilados

A maneira mais fácil de começar é baixar uma versão pré-compilada:

**[Baixar das Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Disponível para:
- macOS (Intel e Apple Silicon)
- Windows (x64)

### Compilar a partir do código-fonte

Requisitos:
- Node.js 20+
- pnpm
- Rust (versão estável mais recente)

```bash
# Clonar o repositório
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Instalar dependências
pnpm install

# Executar em modo de desenvolvimento
pnpm tauri dev

# Compilar para produção
pnpm tauri build
```

---

## Stack tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript (modo strict) |
| Ferramenta de build | Vite 7 |
| Estilização | Tailwind CSS v4 |
| Framework desktop | Tauri v2 (Rust) |
| Gerenciamento de estado | Zustand |
| Canvas visual | @xyflow/react |
| Gráficos | Recharts |

---

## Contribuindo

Recebemos de braços abertos contribuições de pesquisadores, desenvolvedores e tradutores!

Leia nosso [Guia de contribuição](CONTRIBUTING.md) para detalhes sobre:
- Configuração do seu ambiente de desenvolvimento
- Envio de relatórios de bugs e solicitações de funcionalidades
- Nosso código de conduta
- Diretrizes de tradução

---

## Licença

Este projeto é licenciado sob a **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Consulte [LICENSE](LICENSE) para o texto completo da licença.

---

## Agradecimentos

Construído para pesquisadores, por pesquisadores. Inspirado pela necessidade de ferramentas de pesquisa qualitativa éticas, acessíveis e acessíveis.

Agradecimentos especiais à comunidade open-source e a todos que contribuíram para tornar a pesquisa qualitativa mais acessível.

---

## Traduções

- [Inglês / English](README.md)
- [Turco / Türkçe](docs/README.tr.md)
- [Alemão / Deutsch](docs/README.de.md)
- [Espanhol / Español](docs/README.es.md)
- [Francês / Français](docs/README.fr.md)
- [Italiano](docs/README.it.md)
- [Português](docs/README.pt.md)
- [Holandês / Nederlands](docs/README.nl.md)
