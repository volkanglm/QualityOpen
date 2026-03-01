// ─── Lemon Squeezy License Validation ────────────────────────────────────────
// Calls the LS public license-validate endpoint (no API key needed).
// In production set VITE_LS_STORE_SLUG in .env to your LS store slug.

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";

export interface LicenseValidationResult {
  valid:     boolean;
  planName?: string;
  error?:    string;
}

export async function validateLicenseKey(
  key: string,
): Promise<LicenseValidationResult> {
  if (!key.trim()) {
    return { valid: false, error: "Lisans anahtarı boş olamaz." };
  }

  try {
    const body = new URLSearchParams({ license_key: key.trim() });
    const res  = await fetch(LS_VALIDATE, {
      method:  "POST",
      headers: {
        "Accept":       "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    // LS returns 200 for valid keys, 400/422 for invalid
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (res.ok && data.valid === true) {
      const meta = (data.meta ?? {}) as Record<string, unknown>;
      return {
        valid:    true,
        planName: (meta.product_name as string | undefined) ?? "QualityOpen Pro",
      };
    }

    const errMsg =
      typeof data.error   === "string" ? data.error   :
      typeof data.message === "string" ? data.message :
      "Lisans anahtarı geçersiz veya süresi dolmuş.";

    return { valid: false, error: errMsg };
  } catch {
    // Network error — fail open in offline/dev environment
    return {
      valid: false,
      error: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.",
    };
  }
}
