// ─── Lemon Squeezy License Validation ────────────────────────────────────────
// Calls the LS public license-validate endpoint (no API key needed).
// Uses native HTTP to bypass WKWebView restrictions in production.

import { nativeHttp } from "@/lib/nativeHttp";

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";

export interface LicenseValidationResult {
  valid: boolean;
  planName?: string;
  error?: string;
}

export async function validateLicenseKey(
  key: string,
): Promise<LicenseValidationResult> {
  if (!key.trim()) {
    return { valid: false, error: "Lisans anahtarı boş olamaz." };
  }

  try {
    const body = new URLSearchParams({ license_key: key.trim() }).toString();

    const res = await nativeHttp(LS_VALIDATE, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = JSON.parse(res.body) as Record<string, unknown>;

    if (res.status >= 200 && res.status < 300 && data.valid === true) {
      const meta = (data.meta ?? {}) as Record<string, unknown>;
      return {
        valid: true,
        planName: (meta.product_name as string | undefined) ?? "QualityOpen Pro",
      };
    }

    const errMsg =
      typeof data.error === "string" ? data.error :
        typeof data.message === "string" ? data.message :
          "Lisans anahtarı geçersiz veya süresi dolmuş.";

    return { valid: false, error: errMsg };
  } catch {
    return {
      valid: false,
      error: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.",
    };
  }
}
