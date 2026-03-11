import { invoke } from "@tauri-apps/api/core";

export interface LemonSqueezyActivationResponse {
    activated: boolean;
    instance: {
        id: string;
    } | null;
    error: string | null;
    meta: {
        store_id: number;
        order_id: number;
        order_item_id: number;
        product_id: number;
        product_name: string;
        variant_id: number;
        variant_name: string;
        customer_id: number;
        customer_name: string;
        customer_email: string;
    } | null;
}

export async function activateLicense(
    licenseKey: string,
    hardwareId: string
): Promise<LemonSqueezyActivationResponse> {
    try {
        const body = new URLSearchParams({
            license_key: licenseKey,
            instance_name: hardwareId,
        }).toString();

        const [, text] = await invoke<[number, string]>("native_http", {
            method: "POST",
            url: "https://api.lemonsqueezy.com/v1/licenses/activate",
            headersJson: JSON.stringify({
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            }),
            body: body
        });

        // Parse response body
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`Invalid JSON response: ${text.substring(0, 50)}...`);
        }

        if (data.activated) {
            return {
                activated: true,
                instance: { id: data.instance.id },
                error: null,
                meta: data.meta,
            };
        } else {
            console.error("License activation failed:", data);
            return {
                activated: false,
                instance: null,
                error: data.error || "Aktivasyon başarısız (Geçersiz anahtar veya limit aşımı)",
                meta: null,
            };
        }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Ağ hatası veya sunucu yanıt vermedi.";
        console.error("Activation error detail:", error);
        return {
            activated: false,
            instance: null,
            error: errMsg,
            meta: null,
        };
    }
}

export async function deactivateLicense(
    licenseKey: string,
    instanceId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const body = new URLSearchParams({
            license_key: licenseKey,
            instance_id: instanceId,
        }).toString();

        const [status, text] = await invoke<[number, string]>("native_http", {
            method: "POST",
            url: "https://api.lemonsqueezy.com/v1/licenses/deactivate",
            headersJson: JSON.stringify({
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            }),
            body: body
        });

        // Parse response body
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            // If it's not JSON, check status
            if (status >= 200 && status < 300) return { success: true, error: null };
            throw new Error(`Invalid JSON response: ${text.substring(0, 50)}...`);
        }

        if (data.deactivated || (status >= 200 && status < 300)) {
            return { success: true, error: null };
        } else {
            return {
                success: false,
                error: data.error || "Deaktivasyon başarısız.",
            };
        }
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Ağ hatası veya sunucu yanıt vermedi.";
        console.error("Deactivation error detail:", error);
        return {
            success: false,
            error: errMsg,
        };
    }
}
