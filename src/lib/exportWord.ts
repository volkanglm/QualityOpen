import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TableRow,
  TableCell,
  Table,
  WidthType,
  ShadingType,
} from "docx";
import type { Project, Document as QDoc, Code, Segment } from "@/types";

/**
 * Export project data as an APA 7-formatted Word document.
 * - Title page: project name
 * - Section per code: code name as heading, all segments as block quotes
 * - Appendix: segment-per-document table
 */
export async function exportToWord(
  project: Project,
  documents: QDoc[],
  codes: Code[],
  segments: Segment[],
): Promise<void> {
  const projectCodes    = codes.filter((c) => c.projectId === project.id);
  const projectSegments = segments.filter((s) => s.projectId === project.id);
  const projectDocs     = documents.filter((d) => d.projectId === project.id);

  const children: Paragraph[] = [];

  // ── Title ──
  children.push(
    new Paragraph({
      text:    project.name,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Nitel Araştırma Analizi Raporu`,
          italics: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("tr-TR", {
            year: "numeric", month: "long", day: "numeric",
          }),
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
    }),
  );

  // ── Summary statistics ──
  children.push(
    new Paragraph({
      text:    "Özet İstatistikler",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
    }),
  );

  const statsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      statsRow("Belge Sayısı",   String(projectDocs.length)),
      statsRow("Kod Sayısı",     String(projectCodes.length)),
      statsRow("Segment Sayısı", String(projectSegments.length)),
    ],
  });
  children.push(new Paragraph({ children: [] }));  // spacer before table
  // Tables are top-level children, not Paragraphs — handle separately

  // ── Per-code sections ──
  children.push(
    new Paragraph({
      text:    "Kod Bazlı Bulgular",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 480, after: 240 },
    }),
  );

  for (const code of projectCodes) {
    const codeSegs = projectSegments.filter((s) => s.codeIds.includes(code.id));
    if (codeSegs.length === 0) continue;

    // Code heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:  code.name,
            bold:  true,
            size:  28,
            color: code.color.replace("#", ""),
          }),
          new TextRun({
            text: `  (${codeSegs.length} segment)`,
            size: 22,
            color: "888888",
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
      }),
    );

    // Each segment as a block quote
    for (const seg of codeSegs) {
      const doc = projectDocs.find((d) => d.id === seg.documentId);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text:    `"${seg.text}"`,
              italics: true,
              size:    22,
            }),
          ],
          indent:  { left: 720, right: 720 },
          spacing: { before: 120, after: 60 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: code.color.replace("#", "") },
          },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:  `— ${doc?.name ?? "Bilinmeyen belge"}`,
              size:  18,
              color: "888888",
            }),
          ],
          indent:  { left: 720 },
          spacing: { after: 180 },
        }),
      );

      if (seg.memo) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Not: ", bold: true, size: 20, color: "555555" }),
              new TextRun({ text: seg.memo, size: 20, color: "555555" }),
            ],
            indent:  { left: 720 },
            spacing: { after: 120 },
          }),
        );
      }
    }
  }

  // ── Per-document sections ──
  children.push(
    new Paragraph({
      text:    "Belge Bazlı Notlar",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 480, after: 240 },
    }),
  );

  for (const doc of projectDocs) {
    if (!doc.note) continue;
    children.push(
      new Paragraph({
        text:    doc.name,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: doc.note, size: 22 })],
        spacing:  { after: 240 },
      }),
    );
  }

  // Build document
  const wordDoc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font:  "Times New Roman",
            size:  24,             // 12pt = 24 half-points
          },
          paragraph: {
            spacing: { line: 480 }, // double-spacing = 480 twips
          },
        },
      },
    },
    sections: [
      {
        children: [
          ...children,
          new Paragraph({ children: [] }),   // pad after last para
          statsTable,
        ],
      },
    ],
  });

  const blob   = await Packer.toBlob(wordDoc);
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href     = url;
  anchor.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}_analiz.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function statsRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })],
        shading: { type: ShadingType.SOLID, color: "F4F4F5", fill: "F4F4F5" },
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })],
      }),
    ],
  });
}
