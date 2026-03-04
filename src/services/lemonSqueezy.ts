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
        const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                license_key: licenseKey,
                instance_name: hardwareId,
            }),
        });

        const data = await res.json();

        if (data.activated) {
            return {
                activated: true,
                instance: { id: data.instance.id },
                error: null,
                meta: data.meta,
            };
        } else {
            return {
                activated: false,
                instance: null,
                error: data.error || "Aktivasyon başarısız",
                meta: null,
            };
        }
    } catch (error: any) {
        return {
            activated: false,
            instance: null,
            error: error.message || "Ağ hatası",
            meta: null,
        };
    }
}
