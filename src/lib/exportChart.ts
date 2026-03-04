import html2canvas from "html2canvas";

export async function exportElementAsImage(
    element: HTMLElement | null,
    filename: string,
    format: "png" | "jpeg" = "png"
) {
    if (!element) {
        console.error("No element provided for export");
        return;
    }

    // To prevent exporting the export button itself, we can temporarily hide it
    // But a better approach is to configure html2canvas options if needed
    try {
        const canvas = await html2canvas(element, {
            scale: 2, // High resolution
            backgroundColor: "#00000000", // Transparent
            logging: false,
            useCORS: true,
            allowTaint: true,
            ignoreElements: (node) => node.classList.contains("no-export"),
        });

        const dataUrl = canvas.toDataURL(`image/${format}`, format === "jpeg" ? 0.9 : undefined);

        try {
            // Try Tauri Native Save
            const { save } = await import("@tauri-apps/plugin-dialog");
            const { writeFile } = await import("@tauri-apps/plugin-fs");

            const path = await save({
                filters: [{ name: format.toUpperCase(), extensions: [format] }],
                defaultPath: `${filename}.${format}`
            });

            if (path) {
                const base64Data = dataUrl.split(",")[1];
                const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                await writeFile(path, binaryData);

                const { useToastStore } = await import("@/store/toast.store");
                useToastStore.getState().push("Grafik başarıyla kaydedildi.", "success");
                return;
            }
        } catch (tauriErr) {
            console.warn("Tauri native save failed, falling back to browser download:", tauriErr);
            const link = document.createElement("a");
            link.download = `${filename}.${format}`;
            link.href = dataUrl;
            link.click();
        }

    } catch (error) {
        console.error("CRITICAL: Failed to export visualization:", error);
        if (error instanceof Error) {
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        }
        try {
            const { useToastStore } = await import("@/store/toast.store");
            const { useAppStore } = await import("@/store/app.store");
            const { t } = await import("@/lib/i18n");
            const lang = useAppStore.getState().language;
            useToastStore.getState().push(t("ai.error.exportFailed", lang), "error");
        } catch { }
    }
}
