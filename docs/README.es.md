# QualityOpen

> Plataforma gratuita, de código abierto y offline-first para el Análisis de Datos Cualitativos. La alternativa ética a NVivo, ATLAS.ti y MAXQDA.

---

## Características

- **Codificación multimedia** — Codifique Texto, PDF, Imágenes y Video dentro de un único proyecto
- **Análisis asistido por IA** — BYOK (Bring Your Own Key): conecte sus claves de API de OpenAI, Anthropic o Google para chat, síntesis y resumen
- **Analítica visual** — Redes Temáticas, Matriz de Códigos, Mapa de ADN, Flujo Narrativo, Nube de Códigos
- **Soporte en 8 idiomas** — Inglés, Turco, Alemán, Español, Francés, Italiano, Portugués, Neerlandés
- **Meta-síntesis conforme a QMARS** — Sigue los estándares establecidos de reporte de meta-síntesis cualitativa
- **Opciones de exportación enriquecidas** — Word (APA 7), Excel, CSV, PNG, JPEG
- **100% offline** — Sus datos nunca abandonan su dispositivo; no se requiere nube
- **Multiplataforma** — Aplicaciones de escritorio nativas para macOS y Windows

---

## Sitio web

Visita **[qualityopen.com](https://qualityopen.com)** para obtener las últimas actualizaciones, documentación y recursos de la comunidad.

---

## Instalación

### Descargar binarios precompilados

La forma más fácil de comenzar es descargar una versión precompilada:

**[Descargar desde Releases](https://github.com/YOUR_ORG/qualityopen/releases)**

Disponible para:
- macOS (Intel y Apple Silicon)
- Windows (x64)

### Compilar desde el código fuente

Requisitos:
- Node.js 20+
- pnpm
- Rust (última versión estable)

```bash
# Clonar el repositorio
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm tauri dev

# Compilar para producción
pnpm tauri build
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript (modo estricto) |
| Herramienta de compilación | Vite 7 |
| Estilos | Tailwind CSS v4 |
| Framework de escritorio | Tauri v2 (Rust) |
| Gestión de estado | Zustand |
| Lienzo visual | @xyflow/react |
| Gráficos | Recharts |

---

## Contribuciones

¡Damos la bienvenida a las contribuciones de investigadores, desarrolladores y traductores!

Por favor, lea nuestra [Guía de contribución](CONTRIBUTING.md) para obtener detalles sobre:
- Configuración de su entorno de desarrollo
- Envío de informes de errores y solicitudes de funciones
- Nuestro código de conducta
- Directrices de traducción

---

## Licencia

Este proyecto está licenciado bajo la **Licencia Pública General Affero de GNU v3.0 (AGPL-3.0)**.

Consulte [LICENSE](LICENSE) para el texto completo de la licencia.

---

## Agradecimientos

Construido para investigadores, por investigadores. Inspirado por la necesidad de herramientas de investigación cualitativa éticas, asequibles y accesibles.

Un agradecimiento especial a la comunidad de código abierto y a todos los que han contribuido a hacer la investigación cualitativa más accesible.

---

## Traducciones

- [Inglés / English](README.md)
- [Turco / Türkçe](docs/README.tr.md)
- [Alemán / Deutsch](docs/README.de.md)
- [Español](docs/README.es.md)
- [Francés / Français](docs/README.fr.md)
- [Italiano](docs/README.it.md)
- [Portugués / Português](docs/README.pt.md)
- [Neerlandés / Nederlands](docs/README.nl.md)
