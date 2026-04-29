# Contributing to QualityOpen

Thank you for your interest in contributing to QualityOpen! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Translation Guidelines](#translation-guidelines)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/YOUR_ORG/qualityopen/issues) to see if the problem has already been reported.

When submitting a bug report, please include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots or screen recordings (if applicable)
- Your operating system and app version
- Any relevant error messages or logs

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- The problem it solves
- Any potential implementation ideas
- Mockups or diagrams (if applicable)

### Pull Requests

1. Fork the repository
2. Create a new branch following our [naming conventions](#branch-naming-conventions)
3. Make your changes
4. Ensure your code follows the existing style
5. Add or update tests as needed
6. Update documentation if necessary
7. Submit a pull request

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Git](https://git-scm.com/)

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Install dependencies
pnpm install

# Run the app in development mode
pnpm tauri dev
```

The app will open in a new window. Changes to the frontend code will hot-reload automatically. Changes to Rust code require a rebuild.

### Running Tests

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### Building for Production

```bash
pnpm tauri build
```

---

## Branch Naming Conventions

All branches must follow this naming pattern:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/ai-synthesis-panel` |
| `fix/` | Bug fixes | `fix/pdf-render-crash` |
| `docs/` | Documentation changes | `docs/api-reference` |
| `refactor/` | Code refactoring | `refactor/state-management` |
| `test/` | Test-related changes | `test/export-coverage` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that do not affect the meaning of the code (formatting, semicolons, etc.) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding or correcting tests |
| `chore` | Changes to the build process or auxiliary tools |

### Examples

```
feat(coding): add support for video timestamp annotations

fix(export): resolve APA 7 heading level formatting

docs(readme): update installation instructions for Windows

refactor(store): migrate from Redux to Zustand
```

---

## Pull Request Process

1. **Before submitting:**
   - Ensure your branch is up to date with `main`
   - Run all tests and ensure they pass
   - Check that your code follows the project's style guidelines

2. **PR description should include:**
   - What changes were made and why
   - Any related issue numbers (e.g., `Fixes #123`)
   - Screenshots or recordings for UI changes
   - Testing instructions

3. **Review process:**
   - A maintainer will review your PR within a few days
   - Address any requested changes
   - Once approved, a maintainer will merge your PR

4. **After merge:**
   - Your contribution will be included in the next release
   - You will be credited in the release notes and changelog

---

## Translation Guidelines

QualityOpen supports multiple languages. We use a JSON-based translation system located in `src/i18n/locales/`.

### Adding a New Language

1. Create a new file in `src/i18n/locales/` named after the [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language code (e.g., `ja.json` for Japanese)

2. Copy the content from `src/i18n/locales/en.json` as your starting point

3. Translate all string values. **Do not** translate keys — only the values

4. Add the new language to:
   - `src/i18n/config.ts` — add to the `supportedLanguages` array
   - `src/i18n/locales/index.ts` — import and export the new locale

5. Update the README.md to list the new language

### Translation Best Practices

- Keep translations concise — UI space may be limited
- Maintain consistent terminology throughout
- Use formal or academic tone appropriate for research software
- When in doubt, prioritize clarity over literal translation
- Test your translations in the app to ensure they fit the UI

### Updating Existing Translations

If you notice an incorrect or missing translation:

1. Open the relevant locale file (e.g., `src/i18n/locales/tr.json`)
2. Make the correction
3. Submit a PR with the `docs/` or `fix/` prefix

---

## Questions?

If you have questions not covered here, feel free to:
- Open a [GitHub Discussion](https://github.com/YOUR_ORG/qualityopen/discussions)
- Join our community chat (link TBD)
- Email the maintainers at [qualityopen@example.com](mailto:qualityopen@example.com)

Thank you for helping make qualitative research more accessible!
