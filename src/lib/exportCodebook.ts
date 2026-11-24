import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";
import type { Project, Code, Segment } from "@/types";
import { flattenCodes } from "@/lib/tree";
import { downloadFile } from "@/lib/exportUtils";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHexColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#a78bfa";
}

function getCodeStats(codeId: string, segments: Segment[]) {
  const segs = segments.filter((s) => s.codeIds.includes(codeId));
  const weighted = segs.filter((s) => typeof s.weight === "number");
  const avgWeight =
    weighted.length > 0
      ? (weighted.reduce((acc, s) => acc + (s.weight ?? 0), 0) / weighted.length).toFixed(1)
      : "—";
  return { count: segs.length, avgWeight };
}

/**
 * Export a formal APA 7-styled Qualitative Codebook as a Word (.docx) file.
 */
export async function exportCodebookWord(
  project: Project,
  codes: Code[],
  segments: Segment[],
): Promise<void> {
  const projectCodes = codes.filter((c) => c.projectId === project.id);
  const projectSegs = segments.filter((s) => s.projectId === project.id);
  const flat = flattenCodes(projectCodes, undefined, 0);

  const headerCell = (label: string, widthPct: number) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: "F4F4F5" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "18181B" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "18181B" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: "Times New Roman" })],
          spacing: { before: 80, after: 80 },
        }),
      ],
    });

  const bodyCell = (text: string, italic = false, bold = false) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: "E4E4E7" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: text || "—",
              italics: italic,
              bold,
              size: 19,
              font: "Times New Roman",
            }),
          ],
          spacing: { before: 60, after: 60 },
        }),
      ],
    });

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Code / Theme", 18),
        headerCell("Definition", 22),
        headerCell("Inclusion Criteria", 18),
        headerCell("Exclusion Criteria", 16),
        headerCell("Example Quote", 18),
        headerCell("n (Avg W)", 8),
      ],
    }),
    ...flat.map((code) => {
      const { count, avgWeight } = getCodeStats(code.id, projectSegs);
      const indent = "  ".repeat(code.depth);
      const label = `${indent}${code.depth > 0 ? "└ " : ""}${code.name}`;
      return new TableRow({
        children: [
          bodyCell(label, false, code.depth === 0),
          bodyCell(code.description ?? ""),
          bodyCell(code.inclusionCriteria ?? ""),
          bodyCell(code.exclusionCriteria ?? ""),
          bodyCell(code.exampleQuote ? `“${code.exampleQuote}”` : "", true),
          bodyCell(avgWeight === "—" ? String(count) : `${count} (${avgWeight})`),
        ],
      });
    }),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: `${project.name} — Codebook`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Table 1. Qualitative Codebook (APA 7 Format) · ${flat.length} codes · Generated ${new Date().toLocaleDateString()}`,
                italics: true,
                size: 20,
                font: "Times New Roman",
                color: "52525B",
              }),
            ],
            spacing: { after: 240 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = `${project.name.replace(/[^a-z0-9]/gi, "_")}_Codebook_APA7.docx`;

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: safeName,
      filters: [{ name: "Word Document", extensions: ["docx"] }],
    });
    if (!filePath) return;
    const buf = new Uint8Array(await blob.arrayBuffer());
    await writeFile(filePath, buf);
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Export a print-ready APA 7 HTML Codebook.
 */
export function exportCodebookHtml(
  project: Project,
  codes: Code[],
  segments: Segment[],
): void {
  const projectCodes = codes.filter((c) => c.projectId === project.id);
  const projectSegs = segments.filter((s) => s.projectId === project.id);
  const flat = flattenCodes(projectCodes, undefined, 0);

  const rowsHtml = flat
    .map((code) => {
      const { count, avgWeight } = getCodeStats(code.id, projectSegs);
      const pad = code.depth * 16;
      return `<tr>
        <td style="padding-left:${pad + 8}px;font-weight:${code.depth === 0 ? 700 : 400}">
          <span class="dot" style="background:${safeHexColor(code.color)}"></span>
          ${escapeHtml(code.name)}
        </td>
        <td>${escapeHtml(code.description ?? "—")}</td>
        <td>${escapeHtml(code.inclusionCriteria ?? "—")}</td>
        <td>${escapeHtml(code.exclusionCriteria ?? "—")}</td>
        <td class="quote">${code.exampleQuote ? `“${escapeHtml(code.exampleQuote)}”` : "—"}</td>
        <td class="num">${count}${avgWeight === "—" ? "" : ` (${avgWeight})`}</td>
      </tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.name)} — Codebook (APA 7)</title>
<style>
  body { font-family: "Times New Roman", Georgia, serif; max-width: 1080px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.5; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { font-style: italic; color: #444; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; border-top: 2px solid #111; border-bottom: 2px solid #111; font-size: 13px; }
  th { text-align: left; padding: 8px; border-bottom: 1px solid #111; font-weight: 700; }
  td { padding: 8px; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .quote { font-style: italic; color: #333; }
  .num { text-align: right; white-space: nowrap; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>Table 1</h1>
  <div class="subtitle">${escapeHtml(project.name)} — Qualitative Codebook (${flat.length} codes, ${new Date().toLocaleDateString()})</div>
  <table>
    <thead>
      <tr>
        <th>Code / Theme</th>
        <th>Definition</th>
        <th>Inclusion Criteria</th>
        <th>Exclusion Criteria</th>
        <th>Example Quote</th>
        <th class="num">n (Avg W)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

  const safeName = `${project.name.replace(/[^a-z0-9]/gi, "_")}_Codebook_APA7.html`;
  downloadFile(html, safeName, "text/html;charset=utf-8");
}
