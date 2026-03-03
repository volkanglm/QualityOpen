import * as XLSX from "xlsx";
import type { Project, Document as QDoc, Code, Segment } from "@/types";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ExportPayload {
  project: Project;
  documents: QDoc[];
  codes: Code[];
  segments: Segment[];
  syntheses?: import("@/types").Synthesis[];
}

// ─── Download helper ──────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Column auto-width helper ─────────────────────────────────────────────────

function autoWidth(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const colWidths = keys.map((k) => {
    const maxData = Math.max(...data.map((r) => String(r[k] ?? "").length));
    return { wch: Math.min(Math.max(maxData, k.length) + 2, 60) };
  });
  ws["!cols"] = colWidths;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportCSV(payload: ExportPayload): void {
  const rows = buildSegmentRows(payload);
  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  triggerDownload(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `${sanitize(payload.project.name)}_segmentler.csv`,
  );
}

// ─── Excel export ─────────────────────────────────────────────────────────────

export function exportExcel(payload: ExportPayload): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Segments ──
  const segRows = buildSegmentRows(payload);
  const ws1 = XLSX.utils.json_to_sheet(segRows);
  autoWidth(ws1, segRows);
  styleHeaderRow(ws1, segRows.length > 0 ? Object.keys(segRows[0]) : []);
  XLSX.utils.book_append_sheet(wb, ws1, "Segmentler");

  // ── Sheet 2: Codes ──
  const codeRows = payload.codes.map((code) => {
    const parent = payload.codes.find((c) => c.id === code.parentId);
    return {
      "Kod Adı": code.name,
      "Üst Kod": parent?.name ?? "",
      "Renk (HEX)": code.color,
      "Kullanım Sayısı": payload.segments.filter((s) => s.codeIds.includes(code.id)).length,
      "Açıklama": code.description ?? "",
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(codeRows.length ? codeRows : [{ Bilgi: "Kod bulunamadı" }]);
  autoWidth(ws2, codeRows);
  styleHeaderRow(ws2, codeRows.length ? Object.keys(codeRows[0]) : []);
  XLSX.utils.book_append_sheet(wb, ws2, "Kodlar");

  // ── Sheet 3: Documents ──
  const docRows = payload.documents.map((d) => ({
    "Belge Adı": d.name,
    "Tür": d.type,
    "Format": d.format ?? "text",
    "Kelime Sayısı": d.wordCount ?? 0,
    "Segment Sayısı": payload.segments.filter((s) => s.documentId === d.id).length,
  }));
  const ws3 = XLSX.utils.json_to_sheet(docRows.length ? docRows : [{ Bilgi: "Belge bulunamadı" }]);
  autoWidth(ws3, docRows);
  styleHeaderRow(ws3, docRows.length ? Object.keys(docRows[0]) : []);
  XLSX.utils.book_append_sheet(wb, ws3, "Belgeler");

  // ── Sheet 4: Kod Hiyerarşisi ──
  const hierarchyRows = buildHierarchyRows(payload);
  const ws4 = XLSX.utils.json_to_sheet(hierarchyRows.length ? hierarchyRows : [{ Bilgi: "Hiyerarşi yok" }]);
  autoWidth(ws4, hierarchyRows);
  XLSX.utils.book_append_sheet(wb, ws4, "Kod Hiyerarşisi");

  // ── Sheet 5: AI Sentezleri ──
  if (payload.syntheses && payload.syntheses.length > 0) {
    const synthRows = payload.syntheses.map((s) => {
      const code = payload.codes.find(c => c.id === s.codeId);
      return {
        "Kod Adı": code?.name ?? "Bilinmeyen Kod",
        "Özellik/Değişken": s.propertyKey ? `${s.propertyKey}: ${s.propertyValue}` : "Tüm Belgeler",
        "Sentez Metni": s.content,
        "Güncellenme": new Date(s.updatedAt).toLocaleDateString("tr-TR"),
      };
    });
    const ws5 = XLSX.utils.json_to_sheet(synthRows);
    autoWidth(ws5, synthRows);
    styleHeaderRow(ws5, Object.keys(synthRows[0]));
    XLSX.utils.book_append_sheet(wb, ws5, "AI Sentezleri");
  }

  XLSX.writeFile(wb, `${sanitize(payload.project.name)}_export.xlsx`);
}

// ─── Word / APA 7 export ──────────────────────────────────────────────────────

export async function exportWordAPA7(payload: ExportPayload): Promise<void> {
  // Lazy-load docx to keep initial bundle small
  const {
    Document: DocxDocument,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    convertInchesToTwip,
  } = await import("docx");

  const { project, documents, codes, segments } = payload;

  const MARGIN = convertInchesToTwip(1);  // 1-inch margins (APA 7)
  const SPACING = { line: 480, lineRule: "auto" as const }; // double spacing

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: InstanceType<typeof Paragraph>[] = [];

  // ── Title page ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "", break: 1 })],
      spacing: SPACING,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: project.name,
          bold: true,
          size: 28,
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: SPACING,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("tr-TR", {
            year: "numeric", month: "long", day: "numeric",
          }),
          size: 24,
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: SPACING,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${codes.length} kod  ·  ${segments.length} segment  ·  ${documents.length} belge`,
          size: 22,
          color: "777777",
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: SPACING,
    }),
    // Page break
    new Paragraph({
      children: [new TextRun({ text: "", break: 1 })],
      pageBreakBefore: true,
    }),
  );

  // ── Introduction ──
  children.push(
    new Paragraph({
      text: "Metodoloji ve Kod Sistemi",
      heading: HeadingLevel.HEADING_1,
      spacing: SPACING,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Bu belge, ${project.name} projesindeki nitel veri analizi bulgularını ` +
            `APA 7 formatında sunmaktadır. Toplam ${codes.length} kod ve ${segments.length} ` +
            `segment, ${documents.length} kaynaktan elde edilmiştir.`,
          size: 24,
          font: "Times New Roman",
        }),
      ],
      spacing: SPACING,
    }),
  );

  // ── Kod hiyerarşisi ──
  children.push(
    new Paragraph({
      text: "Kod Hiyerarşisi",
      heading: HeadingLevel.HEADING_2,
      spacing: SPACING,
    }),
  );

  const rootCodes = codes.filter((c) => !c.parentId);
  rootCodes.forEach((root) => {
    const children2 = codes.filter((c) => c.parentId === root.id);
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${root.name}`,
            bold: true,
            size: 24,
            font: "Times New Roman",
          }),
          ...(root.description
            ? [new TextRun({ text: ` — ${root.description}`, size: 24, font: "Times New Roman" })]
            : []),
        ],
        spacing: SPACING,
      }),
      ...children2.map(
        (child) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `○ ${child.name}`,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            indent: { left: convertInchesToTwip(0.5) },
            spacing: SPACING,
          }),
      ),
    );
  });

  // ── Page break before results ──
  children.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true }));

  // ── Bulgular (Findings) — one section per code ──
  children.push(
    new Paragraph({
      text: "Bulgular",
      heading: HeadingLevel.HEADING_1,
      spacing: SPACING,
    }),
  );

  const codesWithSegments = codes.filter(
    (c) => segments.some((s) => s.codeIds.includes(c.id)),
  );

  codesWithSegments.forEach((code, _ci) => {
    const codeSegs = segments.filter((s) => s.codeIds.includes(code.id));
    const parentCode = code.parentId ? codes.find((c) => c.id === code.parentId) : null;

    // Code heading
    children.push(
      new Paragraph({
        text: parentCode ? `${parentCode.name}: ${code.name}` : code.name,
        heading: HeadingLevel.HEADING_2,
        spacing: SPACING,
      }),
    );

    if (code.description) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: code.description, italics: true, size: 24, font: "Times New Roman" })],
          spacing: SPACING,
        }),
      );
    }

    codeSegs.forEach((seg) => {
      const srcDoc = documents.find((d) => d.id === seg.documentId);
      const ref = srcDoc?.name ?? "Bilinmeyen Kaynak";

      // APA 7 block quote: indented 0.5-inch both sides for quotes > 40 words
      const wordCount = seg.text.trim().split(/\s+/).length;
      const isBlock = wordCount >= 40;

      if (isBlock) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: seg.text,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            indent: {
              left: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
            },
            spacing: SPACING,
          }),
          // Citation paragraph following block quote
          new Paragraph({
            children: [
              new TextRun({
                text: `(${ref})`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            alignment: AlignmentType.RIGHT,
            indent: {
              left: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
            },
            spacing: SPACING,
          }),
        );
      } else {
        // Inline quote with citation
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `"${seg.text}" `,
                size: 24,
                font: "Times New Roman",
              }),
              new TextRun({
                text: `(${ref})`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: SPACING,
          }),
        );
      }

      if (seg.memo) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Not: ${seg.memo}]`,
                size: 22,
                color: "888888",
                italics: true,
                font: "Times New Roman",
              }),
            ],
            spacing: SPACING,
          }),
        );
      }
    });

    // Spacer between codes
    children.push(new Paragraph({ children: [new TextRun({ text: "" })], spacing: SPACING }));
  });

  // ── AI Sentezleri ──
  if (payload.syntheses && payload.syntheses.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true }));
    children.push(
      new Paragraph({
        text: "AI Sentez Raporu",
        heading: HeadingLevel.HEADING_1,
        spacing: SPACING,
      }),
    );

    payload.syntheses.forEach(s => {
      const code = codes.find(c => c.id === s.codeId);
      children.push(
        new Paragraph({
          text: `${code?.name ?? "Bilinmeyen Kod"}${s.propertyKey ? ` (${s.propertyKey}: ${s.propertyValue})` : " (Tüm Belgeler)"}`,
          heading: HeadingLevel.HEADING_2,
          spacing: SPACING,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: s.content, size: 24, font: "Times New Roman" })
          ],
          spacing: SPACING,
        }),
        new Paragraph({ children: [new TextRun({ text: "" })], spacing: SPACING })
      );
    });
  }

  // ── References page ──
  children.push(
    new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true }),
    new Paragraph({
      text: "Kaynaklar",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: SPACING,
    }),
    ...documents.map(
      (d) =>
        new Paragraph({
          children: [
            new TextRun({
              text: `${d.name}. (${new Date().getFullYear()}). [${d.type}]. QualityOpen.`,
              size: 24,
              font: "Times New Roman",
            }),
          ],
          indent: { hanging: convertInchesToTwip(0.5) },
          spacing: SPACING,
        }),
    ),
  );

  // ── Build document ──
  const docx = new DocxDocument({
    styles: {
      default: {
        document: {
          run: {
            size: 24,
            font: "Times New Roman",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(docx);
  triggerDownload(blob, `${sanitize(project.name)}_APA7.docx`);
}

// ─── PNG / JPEG chart export ──────────────────────────────────────────────────
// Captures an SVG element or a container element to a raster image.

export async function exportChartImage(
  element: HTMLElement | SVGSVGElement,
  filename: string,
  format: "png" | "jpeg" = "png",
): Promise<void> {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const rect = element.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Fill background for JPEG (otherwise black)
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  ctx.fillStyle = isDark ? "#0f0f10" : "#f5f5f7";
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Serialize SVG (works for our SVG-based charts)
  let svgEl: SVGSVGElement | null = null;
  if (element instanceof SVGSVGElement) {
    svgEl = element;
  } else {
    svgEl = element.querySelector("svg");
  }

  if (!svgEl) {
    throw new Error("Dışa aktarılacak grafik bulunamadı.");
  }

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(svgUrl);
      resolve();
    };
    img.onerror = reject;
    img.src = svgUrl;
  });

  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, filename);
    },
    format === "jpeg" ? "image/jpeg" : "image/png",
    0.95,
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildSegmentRows(payload: ExportPayload) {
  return payload.segments.map((seg) => {
    const src = payload.documents.find((d) => d.id === seg.documentId);
    const codeNames = payload.codes
      .filter((c) => seg.codeIds.includes(c.id))
      .map((c) => c.name)
      .join("; ");
    return {
      "Belge": src?.name ?? "",
      "Kod(lar)": codeNames,
      "Metin Alıntısı": seg.text,
      "Başlangıç": seg.start,
      "Bitiş": seg.end,
      "Not": seg.memo ?? "",
      "Vurgulama": seg.isHighlight ? "Evet" : "Hayır",
      "Oluşturulma": new Date(seg.createdAt).toLocaleDateString("tr-TR"),
    };
  });
}

function buildHierarchyRows(payload: ExportPayload) {
  return payload.codes.map((code) => {
    const parent = payload.codes.find((c) => c.id === code.parentId);
    const usageCount = payload.segments.filter((s) => s.codeIds.includes(code.id)).length;
    return {
      "Seviye 1 (Üst)": parent?.name ?? code.name,
      "Seviye 2 (Alt)": parent ? code.name : "",
      "Kullanım": usageCount,
      "Renk": code.color,
    };
  });
}

function styleHeaderRow(ws: XLSX.WorkSheet, keys: string[]) {
  if (!keys.length) return;
  keys.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4B4080" }, patternType: "solid" },
        border: {
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        },
      };
    }
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9_\- ]/g, "_").trim() || "export";
}

