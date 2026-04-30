# QualityOpen

> Ücretsiz, açık kaynaklı, çevrimdışı öncelikli Niteliksel Veri Analizi platformu. NVivo, ATLAS.ti ve MAXQDA'nın etik alternatifi.

---

## Özellikler

- **Çoklu medya kodlama** — Tek bir proje içinde Metin, PDF, Görüntü ve Video kodlayın
- **Yapay zeka destekli analiz** — BYOK (Kendi API Anahtarınızı Getirin): sohbet, sentez ve özetleme için OpenAI, Anthropic veya Google API anahtarlarınızı bağlayın
- **Görsel analitik** — Tematik Ağlar, Kod Matrisi, DNA Haritası, Anlatı Akışı, Kod Bulutu
- **8 dil desteği** — İngilizce, Türkçe, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce, Felemenkçe
- **QMARS uyumlu meta-sentez** — Kurulmuş niteliksel meta-sentez raporlama standartlarını takip eder
- **Zengin dışa aktarım seçenekleri** — Word (APA 7), Excel, CSV, PNG, JPEG
- **%100 çevrimdışı** — Verileriniz cihazınızdan asla ayrılmaz; bulut gerekmez
- **Çapraz platform** — macOS ve Windows için yerel masaüstü uygulamaları

---

## Website

En son güncellemeler, dokümantasyon ve topluluk kaynakları için **[qualityopen.com](https://qualityopen.com)**'u ziyaret edin.

---

## Kurulum

### Önceden Derlenmiş İkili Dosyaları İndirin

Başlamanın en kolay yolu, önceden derlenmiş bir sürüm indirmektir:

**[Sürümlerden İndir](https://github.com/YOUR_ORG/qualityopen/releases)**

Şunlar için mevcuttur:
- macOS (Intel ve Apple Silicon)
- Windows (x64)

### Kaynaktan Derleme

Gereksinimler:
- Node.js 20+
- pnpm
- Rust (en son kararlı sürüm)

```bash
# Depoyu klonlayın
git clone https://github.com/YOUR_ORG/qualityopen.git
cd qualityopen

# Bağımlılıkları yükleyin
pnpm install

# Geliştirme modunda çalıştırın
pnpm tauri dev

# Üretim için derleyin
pnpm tauri build
```

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Ön Uç | React 19 + TypeScript (strict mod) |
| Derleme Aracı | Vite 7 |
| Stil | Tailwind CSS v4 |
| Masaüstü Çerçevesi | Tauri v2 (Rust) |
| Durum Yönetimi | Zustand |
| Görsel Tuval | @xyflow/react |
| Grafikler | Recharts |

---

## Katkıda Bulunma

Araştırmacıları, geliştiricileri ve çevirmenleri katkıda bulunmaya davet ediyoruz!

Detaylar için [Katkı Rehberimizi](CONTRIBUTING.md) okuyun:
- Geliştirme ortamınızı kurma
- Hata raporları ve özellik taleplerini gönderme
- Davranış kurallarımız
- Çeviri yönergeleri

---

## Lisans

Bu proje **GNU Affero Genel Kamu Lisansı v3.0 (AGPL-3.0)** altında lisanslanmıştır.

Tam lisans metni için [LICENSE](LICENSE) dosyasına bakın.

---

## Teşekkürler

Araştırmacılar için, araştırmacılar tarafından inşa edildi. Etiğe uygun, uygun fiyatlı ve erişilebilir niteliksel araştırma araçları ihtiyacından ilham alındı.

Niteliksel araştırmayı daha erişilebilir hale getirmeye katkıda bulunan herkese ve açık kaynak topluluğuna özel teşekkürler.

---

## Çeviriler

- [İngilizce](README.md)
- [Türkçe](docs/README.tr.md)
- [Almanca](docs/README.de.md)
