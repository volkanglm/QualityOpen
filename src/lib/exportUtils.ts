import type { Code } from "@/types";

/**
 * Converts a code tree to a tab-indented text representation.
 */
export function codesToText(codes: Code[], parentId?: string, depth = 0): string {
    const children = codes.filter(c => c.parentId === parentId);
    let output = "";

    children.forEach(code => {
        output += "  ".repeat(depth) + code.name + (code.description ? ` (${code.description})` : "") + "\n";
        output += codesToText(codes, code.id, depth + 1);
    });

    return output;
}

/**
 * Converts a code tree to a CSV string.
 */
export function codesToCSV(codes: Code[]): string {
    const header = "ID,Name,ParentID,Color,Description\n";
    const rows = codes.map(c => {
        const name = `"${c.name.replace(/"/g, '""')}"`;
        const desc = `"${(c.description || "").replace(/"/g, '""')}"`;
        return `${c.id},${name},${c.parentId || ""},${c.color || ""},${desc}`;
    });

    return header + rows.join("\n");
}

/**
 * Triggers a file save dialog and writes the content to disk.
 */
export async function downloadFile(content: string, filename: string, mimeType: string) {
    console.log(`Attempting to save file: ${filename} (${mimeType})`);
    try {
        // Try to use Tauri native dialog & FS
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");

        const path = await save({
            filters: [{
                name: mimeType.split("/")[1]?.toUpperCase() || "File",
                extensions: [filename.split(".").pop() || "txt"]
            }],
            defaultPath: filename
        });

        if (path) {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            await writeFile(path, data);
            console.log("File saved successfully to:", path);

            const { useToastStore } = await import("@/store/toast.store");
            useToastStore.getState().push("Dosya başarıyla kaydedildi.", "success");
        }
    } catch (err) {
        console.warn("Tauri native save failed, falling back to browser download:", err);
        // Fallback for browser/dev environment
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Browser download triggered as fallback.");
        } catch (fallbackErr) {
            console.error("All download methods failed:", fallbackErr);
        }
    }
}
