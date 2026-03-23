import type { Code, ReflexivityEntry } from "@/types";

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

/**
 * Exports reflexivity entries as a formatted text file for APA Method section context.
 */
export async function exportReflexivityAsText(entries: ReflexivityEntry[], projectName: string) {
    let content = `Reflexivity Journal: ${projectName}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `=================================================================\n\n`;

    const sortedEntries = [...entries].sort((a, b) => a.date - b.date);

    for (const entry of sortedEntries) {
        const dateStr = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(entry.date);
        content += `[${dateStr}]\n`;
        content += `${entry.content}\n\n`;
        content += `-----------------------------------------------------------------\n\n`;
    }

    const filename = `Reflexivity_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    await downloadFile(content, filename, "text/plain");
}

/**
 * Generates an HTML report grouping document segments by Code for "Member Checking" (Katılımcı Teyidi).
 */
export async function exportMemberCheckHTML(
    doc: import("@/types").Document,
    codes: import("@/types").Code[],
    segments: import("@/types").Segment[]
) {
    const docSegments = segments.filter(s => s.documentId === doc.id && s.codeIds.length > 0);
    const grouped: Record<string, import("@/types").Segment[]> = {};
    docSegments.forEach(seg => {
        seg.codeIds.forEach(cId => {
            if (!grouped[cId]) grouped[cId] = [];
            grouped[cId].push(seg);
        });
    });

    let htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Katılımcı Teyidi (Member Check) - ${doc.name}</title>
    <style>
    body { font-family: "Georgia", serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { font-size: 24px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    .intro { background: #f9f9f9; padding: 15px; border-left: 4px solid #4ade80; margin-bottom: 30px; border-radius: 4px; }
    .code-section { margin-top: 40px; margin-bottom: 20px; }
    .code-title { font-size: 18px; font-weight: bold; color: #0284c7; margin-bottom: 15px; padding-bottom: 4px; border-bottom: 1px dashed #ccc; }
    .quote { background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 15px; font-style: italic; border-left: 3px solid #60a5fa; }
    .disconfirming-title { font-size: 14px; font-weight: bold; color: #e11d48; margin: 20px 0 10px 0; display: flex; items-center gap: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .disconfirming-quote { background: #fff1f2; border-left: 3px solid #fb7185; }
    .disconfirming-note { font-size: 12px; color: #be123c; margin-top: 5px; font-style: normal; font-weight: 500; }
    </style>
</head>
<body>
    <h1>Katılımcı Teyidi Formu (Member Check)</h1>
    <div class="intro">
    <p><strong>Değerli Katılımcımız,</strong></p>
    <p>Bu rapor, sizinle yapılan görüşmenin (<em>${doc.name}</em>) araştırmacı tarafından nasıl analiz edildiğini göstermektedir. 
    Aşağıda, ifadelerinizin hangi temalar (kodlar) altında sınıflandırıldığı listelenmiştir. Lütfen bu yorumların sizin asıl anlatmak istediklerinizi yansıtıp yansıtmadığını kontrol ediniz.</p>
    <p style="font-size: 14px; margin-top: 15px; color: #666;"><strong>Açıklama:</strong> APA JARS kalite standartları gereğince "Methodological Integrity" (Metodolojik Bütünlük) sağlamak amacıyla katılımcı teyidi gerçekleştirilmektedir.</p>
    </div>    
    `;

    if (Object.keys(grouped).length === 0) {
        htmlContent += `<p>Bu belge için henüz bir kodlama yapılmamıştır.</p>`;
    } else {
        for (const [codeId, segs] of Object.entries(grouped)) {
            const codeItem = codes.find(c => c.id === codeId);
            if (!codeItem) continue;

            htmlContent += `<div class="code-section">`;
            htmlContent += `<div class="code-title">Tema / Kod: ${codeItem.name}</div>`;
            
            const normalSegs = segs.filter(s => !s.isDisconfirming);
            const disconfirmingSegs = segs.filter(s => s.isDisconfirming);

            normalSegs.sort((a,b) => a.start - b.start).forEach(seg => {
                const text = seg.text.replace(/\n/g, "<br/>");
                htmlContent += `<div class="quote">"${text}"</div>`;
            });

            if (disconfirmingSegs.length > 0) {
                htmlContent += `<div class="disconfirming-title">⚡ Zıt Kanıtlar (Disconfirming Instances)</div>`;
                disconfirmingSegs.sort((a,b) => a.start - b.start).forEach(seg => {
                    const text = seg.text.replace(/\n/g, "<br/>");
                    htmlContent += `<div class="quote disconfirming-quote">`;
                    htmlContent += `"${text}"`;
                    if (seg.disconfirmingNote) {
                        htmlContent += `<div class="disconfirming-note">Açıklama: ${seg.disconfirmingNote}</div>`;
                    }
                    htmlContent += `</div>`;
                });
            }

            htmlContent += `</div>`;
        }
    }

    htmlContent += `
</body>
</html>`;

    const filename = `MemberCheck_${doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    await downloadFile(htmlContent, filename, "text/html");
}

