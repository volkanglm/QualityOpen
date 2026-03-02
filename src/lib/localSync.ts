import { open } from "@tauri-apps/plugin-dialog";
import {
    writeTextFile,
    mkdir,
    exists,
    writeFile
} from "@tauri-apps/plugin-fs";

/**
 * Lets the user select a local folder for synchronization.
 * Returns the path if selected, or null.
 */
export async function pickLocalSyncFolder(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: "Senkronizasyon Klasörü Seçin",
    });

    if (typeof selected === "string") {
        return selected;
    }
    return null;
}

/**
 * Writes the full project snapshot to the local sync folder.
 */
export async function syncDataToLocal(path: string, snapshot: any): Promise<void> {
    try {
        const backupDir = `${path}/backups`;
        if (!(await exists(backupDir))) {
            await mkdir(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `QualityOpen_Backup_${timestamp}.json`;

        await writeTextFile(`${backupDir}/${fileName}`, JSON.stringify(snapshot, null, 2));
        // Also update a 'latest' pointer or fixed file
        await writeTextFile(`${path}/latest_backup.json`, JSON.stringify(snapshot, null, 2));

        console.log("[LocalSync] Data synced to:", path);
    } catch (err) {
        console.error("[LocalSync] Sync to local FAILED:", err);
        throw err;
    }
}

/**
 * Copies a source document to the local sync folder if requested.
 */
export async function copyDocumentToLocal(
    folderPath: string,
    fileName: string,
    content: string | Uint8Array,
    category: "document" | "video" | "image"
): Promise<void> {
    try {
        const docsDir = `${folderPath}/sources/${category}`;
        if (!(await exists(docsDir))) {
            await mkdir(docsDir, { recursive: true });
        }

        const filePath = `${docsDir}/${fileName}`;

        if (typeof content === "string") {
            // Content might be base64 (for PDF/Images) or raw text/html
            if (content.startsWith("data:") || content.length > 100000) {
                // Potentially binary/base64
                // Simplified for now: just write as text if it's text, 
                // but for real files we'd want actual binary.
                await writeTextFile(filePath, content);
            } else {
                await writeTextFile(filePath, content);
            }
        } else {
            await writeFile(filePath, content);
        }

        console.log("[LocalSync] Document copied to:", filePath);
    } catch (err) {
        console.warn("[LocalSync] Copy document FAILED:", err);
    }
}
