import DOMPurify from "dompurify";
import type { DocumentFormat } from "@/types";

export interface ImportedFile {
  name: string;
  content: string;
  format: DocumentFormat;
  wordCount: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── TXT ─────────────────────────────────────────────────────────────────────

function importTxt(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      resolve({
        name: file.name.replace(/\.[^.]+$/, ""),
        content,
        format: "text",
        wordCount: countWords(content),
      });
    };
    reader.onerror = () => reject(new Error("Failed to read TXT file"));
    reader.readAsText(file, "utf-8");
  });
}

// ─── DOCX (via mammoth) ───────────────────────────────────────────────────────

async function importDocx(file: File): Promise<ImportedFile> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });

  // Strip empty paragraphs mammoth sometimes generates
  const html = result.value
    .replace(/<p><\/p>/g, "")
    .replace(/<p>\s*<\/p>/g, "");

  // Extract plain text while preserving paragraph breaks.
  // DOMPurify strips any script / event-handler injected via a malicious .docx
  // before we set innerHTML, so XSS payloads embedded in Word documents are
  // neutralised even on a disconnected (off-DOM) element.
  const div = globalThis.document?.createElement("div");
  if (div) {
    const safeHtml = DOMPurify.sanitize(html.replace(/<\/p>/g, "</p>\n\n"), {
      ALLOWED_TAGS: ["p", "br", "b", "i", "em", "strong", "span", "div",
        "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li"],
      ALLOWED_ATTR: [],
    });
    div.innerHTML = safeHtml;
    const text = div.textContent?.trim() ?? "";
    return {
      name: file.name.replace(/\.[^.]+$/, ""),
      content: text,
      format: "text",
      wordCount: countWords(text),
    };
  }

  const plainText = html.replace(/<[^>]+>/g, "\n\n").trim();
  return {
    name: file.name.replace(/\.[^.]+$/, ""),
    content: plainText,
    format: "text",
    wordCount: countWords(plainText),
  };
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function importPdf(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve({
        name: file.name.replace(/\.[^.]+$/, ""),
        content: base64,
        format: "pdf",
        wordCount: 0, // word count extracted lazily in PdfRenderer
      });
    };
    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsDataURL(file);
  });
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

async function importCsv(file: File): Promise<ImportedFile> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return {
      name: file.name.replace(/\.[^.]+$/, ""),
      content: "",
      format: "text",
      wordCount: 0,
    };
  }

  // Parse CSV: detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  const delimiters = [",", ";", "\t"];
  const delimiter =
    delimiters.sort(
      (a, b) => firstLine.split(b).length - firstLine.split(a).length
    )[0];

  const parseRow = (row: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const rows = lines.map(parseRow);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Format as readable text: "Header: Value" per row
  const formatted = dataRows
    .map((row, idx) => {
      const pairs = headers
        .map((h, i) => (row[i] ? `${h}: ${row[i]}` : null))
        .filter(Boolean)
        .join(" | ");
      return `[${idx + 1}] ${pairs}`;
    })
    .join("\n\n");

  return {
    name: file.name.replace(/\.[^.]+$/, ""),
    content: formatted,
    format: "text",
    wordCount: countWords(formatted),
  };
}

// ─── Video ────────────────────────────────────────────────────────────────────
// Video is stored as a blob URL for the current session.
// Blob URLs are revoked when the app restarts; VideoPlayer shows a re-import prompt.

function importVideo(file: File): ImportedFile {
  const url = URL.createObjectURL(file);
  return {
    name: file.name.replace(/\.[^.]+$/, ""),
    content: url,
    format: "video",
    wordCount: 0,
  };
}

// ─── Image ────────────────────────────────────────────────────────────────────

function importImage(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name.replace(/\.[^.]+$/, ""),
      content: reader.result as string,
      format: "image",
      wordCount: 0,
    });
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getFileCategory(file: File): "text" | "video" | "image" | "audio" | "other" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  return "text";
}

export async function importFile(file: File): Promise<ImportedFile> {
  const cat = getFileCategory(file);
  if (cat === "video") return importVideo(file);
  if (cat === "audio") {
    const url = URL.createObjectURL(file);
    return {
      name: file.name.replace(/\.[^.]+$/, ""),
      content: url,
      format: "video", // We still use video format but mediaType will differ
      wordCount: 0,
    };
  }
  if (cat === "image") return importImage(file);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "txt": return importTxt(file);
    case "csv": return importCsv(file);
    case "docx":
    case "doc": return importDocx(file);
    case "pdf": return importPdf(file);
    default: return importTxt(file);
  }
}

export const ACCEPTED_EXTENSIONS =
  ".txt,.csv,.doc,.docx,.pdf,.mp4,.webm,.mov,.avi,.mkv,.jpg,.jpeg,.png,.gif,.webp,.svg";
export const ACCEPTED_MIME_TYPES =
  "text/plain,application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "video/*,image/*";
