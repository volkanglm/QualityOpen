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

  // Extract plain text for word count
  const div = globalThis.document?.createElement("div");
  if (div) {
    div.innerHTML = html;
    const text = div.textContent ?? "";
    return {
      name: file.name.replace(/\.[^.]+$/, ""),
      content: html,
      format: "html",
      wordCount: countWords(text),
    };
  }

  return {
    name: file.name.replace(/\.[^.]+$/, ""),
    content: html,
    format: "html",
    wordCount: 0,
  };
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function importPdf(file: File): Promise<ImportedFile> {
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

// ─── Video ────────────────────────────────────────────────────────────────────
// Video is stored as a blob URL for the current session.
// Blob URLs are revoked when the app restarts; VideoPlayer shows a re-import prompt.

function importVideo(file: File): ImportedFile {
  const url = URL.createObjectURL(file);
  return {
    name:      file.name.replace(/\.[^.]+$/, ""),
    content:   url,
    format:    "video",
    wordCount: 0,
  };
}

// ─── Image ────────────────────────────────────────────────────────────────────

function importImage(file: File): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({
      name:      file.name.replace(/\.[^.]+$/, ""),
      content:   reader.result as string,
      format:    "image",
      wordCount: 0,
    });
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getFileCategory(file: File): "text" | "video" | "image" | "other" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  return "text";
}

export async function importFile(file: File): Promise<ImportedFile> {
  const cat = getFileCategory(file);
  if (cat === "video") return importVideo(file);
  if (cat === "image") return importImage(file);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "txt":  return importTxt(file);
    case "docx":
    case "doc":  return importDocx(file);
    case "pdf":  return importPdf(file);
    default:     return importTxt(file);
  }
}

export const ACCEPTED_EXTENSIONS =
  ".txt,.doc,.docx,.pdf,.mp4,.webm,.mov,.avi,.mkv,.jpg,.jpeg,.png,.gif,.webp,.svg";
export const ACCEPTED_MIME_TYPES =
  "text/plain,application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "video/*,image/*";
