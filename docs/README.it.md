# QualityOpen

> Piattaforma gratuita, open-source e offline-first per l'Analisi dei Dati Qualitativi. L'alternativa etica a NVivo, ATLAS.ti e MAXQDA.

---

## Funzionalità

- **Codifica multimediale** — Codifica Testo, PDF, Immagini e Video all'interno di un singolo progetto
- **Analisi assistita dall'IA** — BYOK (Bring Your Own Key): collega le tue chiavi API OpenAI, Anthropic o Google per chat, sintesi e riassunto
- **Analitica visiva** — Reti Tematiche, Matrice dei Codici, Mappa del DNA, Flusso Narrativo, Nuvola dei Codici
- **Supporto in 8 lingue** — Inglese, Turco, Tedesco, Spagnolo, Francese, Italiano, Portoghese, Olandese
- **Meta-sintesi conforme a QMARS** — Segue gli standard stabiliti per la rendicontazione della meta-sintesi qualitativa
- **Opzioni di esportazione avanzate** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — I tuoi dati non lasciano mai il tuo dispositivo; nessun cloud richiesto
- **Multipiattaforma** — App desktop native per macOS e Windows

---

## Screenshot

### Dashboard del progetto
*Panoramica di documenti, codici e progresso dell'analisi.*

![Dashboard](docs/screenshots/dashboard.png)

### Interfaccia di codifica dei documenti
*Seleziona segmenti di testo, immagini o video e assegna i codici.*

![Coding](docs/screenshots/coding.png)

### Analitica visiva — Rete Tematica
*Esplora interattivamente le relazioni tra codici e temi.*

![Thematic Network](docs/screenshots/thematic-network.png)

### Assistente di analisi IA
*Chatta con i tuoi dati utilizzando la tua chiave API.*

![AI Assistant](docs/screenshots/ai-assistant.png)

### Esportazione e reportistica
*Genera report pronti per la pubblicazione in formato APA 7.*

![Export](docs/screenshots/export.png)

---

## Installazione

### Scarica i binari precompilati

Il modo più semplice per iniziare è scaricare una versione precompilata:

**[Scarica dalle Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Disponibile per:
- macOS (Intel e Apple Silicon)
- Windows (x64)

### Compila dai sorgenti

Requisiti:
- Node.js 20+
- pnpm
- Rust (ultima versione stabile)

```bash
# Clona il repository
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Installa le dipendenze
pnpm install

# Esegui in modalità sviluppo
pnpm tauri dev

# Compila per la produzione
pnpm tauri build
```

---

## Stack tecnologico

| Livello | Tecnologia |
|---------|------------|
| Frontend | React 19 + TypeScript (modalità strict) |
| Strumento di build | Vite 7 |
| Stile | Tailwind CSS v4 |
| Framework desktop | Tauri v2 (Rust) |
| Gestione dello stato | Zustand |
| Canvas visivo | @xyflow/react |
| Grafici | Recharts |

---

## Contribuire

Diamo il benvenuto ai contributi di ricercatori, sviluppatori e traduttori!

Leggi la nostra [Guida per i contributori](CONTRIBUTING.md) per i dettagli su:
- Configurazione del tuo ambiente di sviluppo
- Invio di segnalazioni di bug e richieste di funzionalità
- Il nostro codice di condotta
- Linee guida per le traduzioni

---

## Licenza

Questo progetto è rilasciato sotto la **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Consulta [LICENSE](LICENSE) per il testo completo della licenza.

---

## Ringraziamenti

Costruito per ricercatori, da ricercatori. Ispirato dalla necessità di strumenti di ricerca qualitativa etici, accessibili e convenienti.

Un ringraziamento speciale alla comunità open-source e a tutti coloro che hanno contribuito a rendere la ricerca qualitativa più accessibile.

---

## Traduzioni

- [Inglese / English](README.md)
- [Turco / Türkçe](docs/README.tr.md)
- [Tedesco / Deutsch](docs/README.de.md)
- [Spagnolo / Español](docs/README.es.md)
- [Francese / Français](docs/README.fr.md)
- [Italiano](docs/README.it.md)
- [Portoghese / Português](docs/README.pt.md)
- [Olandese / Nederlands](docs/README.nl.md)
