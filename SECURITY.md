# Security Policy

## Supported Versions

The following versions of QualityOpen are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| < 1.3   | :x:                |

We recommend always using the latest stable release.

---

## Reporting a Vulnerability

We take the security of QualityOpen seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Reporting Methods

**Preferred method (for non-critical issues):**
- Open a [GitHub Security Advisory](https://github.com/YOUR_ORG/qualityopen/security/advisories/new)

**Alternative method (for sensitive or critical issues):**
- Email: [security@qualityopen.org](mailto:security@qualityopen.org)

Please do **not** report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### What to Include

When reporting a vulnerability, please provide:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested mitigations or fixes
- Your contact information for follow-up questions

### Response Process

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
2. **Investigation**: We will investigate and validate the reported issue
3. **Resolution**: We will work to develop and test a fix
4. **Disclosure**: We will coordinate with you on public disclosure timing. We aim to disclose within 90 days of fix availability, or sooner if the vulnerability is actively exploited

We are committed to:
- Not taking legal action against security researchers who act in good faith
- Working transparently with reporters to address vulnerabilities
- Crediting researchers who responsibly disclose vulnerabilities (unless they prefer anonymity)

---

## Security Best Practices

### Application Design

QualityOpen is designed with security and privacy as core principles:

- **Offline-first architecture**: All data is stored locally on your device. No data is transmitted to our servers
- **No telemetry**: The application does not collect usage data, crash reports, or analytics without explicit opt-in
- **BYOK for AI**: API keys for AI features are stored securely using the operating system's native keychain / credential store
- **No external dependencies for core functionality**: The app works fully without an internet connection

### For Users

- **Keep the app updated**: Install updates promptly to receive the latest security patches
- **Secure your device**: Use full-disk encryption and screen locks on your computer
- **API key management**: Store your AI provider API keys securely. Do not share them or commit them to version control
- **Backup your projects**: Regularly back up your project files to prevent data loss

### For Developers

- **Dependency management**: Run `pnpm audit` regularly and address reported vulnerabilities
- **Rust safety**: Follow Rust's ownership and borrowing rules to prevent memory safety issues
- **Input validation**: Validate all user inputs, especially file paths and imported data
- **Secure storage**: Use Tauri's `stronghold` or OS keychain APIs for sensitive data

---

## Security-Related Configuration

### Disabling Automatic Updates

QualityOpen checks for updates via the GitHub API. If you prefer to review updates manually, you can disable auto-check in the application settings.

### AI Provider API Keys

API keys for OpenAI, Anthropic, and Google are stored using:
- **macOS**: Keychain
- **Windows**: Windows Credential Manager

They are never written to plain text files or sent to any server other than the respective AI provider's API endpoint.

---

## Past Security Advisories

No security advisories have been issued to date.

---

## Contact

For security-related questions or concerns, contact:
- Email: [security@qualityopen.org](mailto:security@qualityopen.org)
