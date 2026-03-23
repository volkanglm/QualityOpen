import * as XLSX from "xlsx";
import type { Project, Document as QDoc, Code, Segment } from "@/types";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ExportPayload {
  project: Project;
  documents: QDoc[];
  codes: Code[];
  segments: Segment[];
  syntheses?: import("@/types").Synthesis[];
  auditLog?: import("@/types").AuditLogEntry[];
  includeContextPadding?: boolean;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function getPaddedContext(content: string, start: number, end: number, originalText: string): string {
  const before = content.slice(0, start);
  const after = content.slice(end);
  
  const wordsBefore = before.split(/\s+/).filter(Boolean);
  const wordsAfter = after.split(/\s+/).filter(Boolean);
  
  const prefix = wordsBefore.slice(-50).join(" ");
  const suffix = wordsAfter.slice(0, 50).join(" ");
  
  const cleanPrefix = prefix ? `...${prefix.replace(/\n/g, " ")} ` : "";
  const cleanSuffix = suffix ? ` ${suffix.replace(/\n/g, " ")}...` : "";
  
  return `${cleanPrefix}${originalText.replace(/\n/g, " ")}${cleanSuffix}`;
}

export function getCitation(doc: QDoc | undefined): string {
  if (!doc) return "Bilinmeyen Kaynak";
  const parts = [doc.name];
  if (doc.metadata) {
      const pid = doc.metadata["Participant ID"] || doc.metadata["Katılımcı ID"] || doc.metadata["Participant"] || doc.metadata["Katılımcı"];
      if (pid) parts.push(pid);
  }
  return parts.join(" / ");
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
  const rows = buildCodeRows(payload);
  const ws = XLSX.utils.json_to_sheet(rows);
  autoWidth(ws, rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  triggerDownload(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `${sanitize(payload.project.name)}_kodlar.csv`,
  );
}

// ─── Excel export ─────────────────────────────────────────────────────────────

export function exportExcel(payload: ExportPayload): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Codes & Quotes (code-centric) ──
  const codeRows = buildCodeRows(payload);
  const ws1 = XLSX.utils.json_to_sheet(codeRows.length ? codeRows : [{ Bilgi: "Segment bulunamadı" }]);
  autoWidth(ws1, codeRows);
  styleHeaderRow(ws1, codeRows.length ? Object.keys(codeRows[0]) : []);
  XLSX.utils.book_append_sheet(wb, ws1, "Kodlar ve Alıntılar");

  // ── Sheet 2: Code Tree ──
  const hierarchyRows = buildHierarchyRows(payload);
  const ws2 = XLSX.utils.json_to_sheet(hierarchyRows.length ? hierarchyRows : [{ Bilgi: "Hiyerarşi yok" }]);
  autoWidth(ws2, hierarchyRows);
  styleHeaderRow(ws2, hierarchyRows.length ? Object.keys(hierarchyRows[0]) : []);
  XLSX.utils.book_append_sheet(wb, ws2, "Kod Ağacı");

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

  // ── Sheet 4: AI Syntheses ──
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
    const ws4 = XLSX.utils.json_to_sheet(synthRows);
    autoWidth(ws4, synthRows);
    styleHeaderRow(ws4, Object.keys(synthRows[0]));
    XLSX.utils.book_append_sheet(wb, ws4, "AI Sentezleri");
  }

  // ── Sheet 5: Audit Log ──
  if (payload.auditLog && payload.auditLog.length > 0) {
    const auditRows = [...payload.auditLog].sort((a, b) => b.timestamp - a.timestamp).map((log) => ({
      "Tarih/Saat": new Date(log.timestamp).toLocaleString("tr-TR"),
      "İşlem (Action)": log.action,
      "Detaylar": log.details,
    }));
    const ws5 = XLSX.utils.json_to_sheet(auditRows);
    autoWidth(ws5, auditRows);
    styleHeaderRow(ws5, Object.keys(auditRows[0]));
    XLSX.utils.book_append_sheet(wb, ws5, "İşlem Geçmişi");
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

    const normalSegs = codeSegs.filter(s => !s.isDisconfirming);
    const disconfirmingSegs = codeSegs.filter(s => s.isDisconfirming);

    const renderSeg = (seg: Segment) => {
      const srcDoc = documents.find((d) => d.id === seg.documentId);
      const ref = getCitation(srcDoc);

      let text = seg.text;
      if (payload.includeContextPadding && srcDoc) {
          text = getPaddedContext(srcDoc.content, seg.start, seg.end, text);
      }

      // APA 7 block quote: indented 0.5-inch both sides for quotes > 40 words
      const wordCount = text.trim().split(/\s+/).length;
      const isBlock = wordCount >= 40;

      if (isBlock) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24,
                font: "Times New Roman",
                color: seg.isDisconfirming ? "e11d48" : undefined,
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
                text: `[${ref}]`,
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
                text: `"${text}" `,
                size: 24,
                font: "Times New Roman",
                color: seg.isDisconfirming ? "e11d48" : undefined,
              }),
              new TextRun({
                text: `[${ref}]`,
                italics: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
            spacing: SPACING,
          }),
        );
      }

      if (seg.isDisconfirming && seg.disconfirmingNote) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Zıt Kanıt Notu: ${seg.disconfirmingNote}]`,
                size: 22,
                color: "be123c",
                bold: true,
                font: "Times New Roman",
              }),
            ],
            spacing: SPACING,
            indent: { left: isBlock ? convertInchesToTwip(0.5) : 0 },
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
            indent: { left: isBlock ? convertInchesToTwip(0.5) : 0 },
          }),
        );
      }
    };

    normalSegs.forEach(renderSeg);

    if (disconfirmingSegs.length > 0) {
      children.push(
        new Paragraph({
          text: "Zıt Kanıtlar (Disconfirming Instances)",
          heading: HeadingLevel.HEADING_3,
          spacing: { ...SPACING, before: 240 },
        }),
      );
      disconfirmingSegs.forEach(renderSeg);
    }

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

  // ── Audit Log ──
  if (payload.auditLog && payload.auditLog.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true }));
    children.push(
      new Paragraph({
        text: "Kod Evrimi (Denetim İzi / Audit Trail)",
        heading: HeadingLevel.HEADING_1,
        spacing: SPACING,
      }),
    );
    const sortedLog = [...payload.auditLog].sort((a, b) => b.timestamp - a.timestamp);
    sortedLog.forEach((log) => {
      const dateStr = new Date(log.timestamp).toLocaleString("tr-TR");
      let actionLabel = log.action;
      if (log.action === "CREATE_CODE") actionLabel = "Yeni Kod";
      if (log.action === "UPDATE_CODE") actionLabel = "Güncelleme";
      if (log.action === "DELETE_CODE") actionLabel = "Silme";
      if (log.action === "MOVE_CODE") actionLabel = "Taşıma";

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${dateStr}] ${actionLabel}: `, bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: log.details, size: 24, font: "Times New Roman" })
          ],
          indent: { left: convertInchesToTwip(0.3) },
          spacing: SPACING,
        })
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

// ─── Code-centric export: one row per code, ALL quotes + doc names ────────────

function buildCodeRows(payload: ExportPayload) {
  return payload.codes.map((code) => {
    const parent = payload.codes.find((c) => c.id === code.parentId);
    const codeSegs = payload.segments.filter((s) => s.codeIds.includes(code.id));

    // Produce "quote text [Document Name / Participant ID]" entries joined with " | "
    const quotes = codeSegs
      .map((seg) => {
        const doc = payload.documents.find((d) => d.id === seg.documentId);
        const ref = getCitation(doc);
        
        let text = seg.text.replace(/\n/g, " ").trim();
        if (payload.includeContextPadding && doc) {
           text = getPaddedContext(doc.content, seg.start, seg.end, text);
        }

        const prefix = seg.isDisconfirming ? "(⚡ ZIT KANIT) " : "";
        const note = (seg.isDisconfirming && seg.disconfirmingNote) ? ` {Not: ${seg.disconfirmingNote}}` : "";
        
        return ref !== "Bilinmeyen Kaynak" ? `${prefix}${text} [${ref}]${note}` : `${prefix}${text}${note}`;
      })
      .join(" | ");

    return {
      "Kod Adı": code.name,
      "Üst Kod": parent?.name ?? "",
      "Kullanım Sayısı": codeSegs.length,
      "Alıntılar (Belge Adıyla)": quotes,
      "Açıklama": code.description ?? "",
    };
  });
}

// ─── Segment-level rows (kept for Word export internals) ──────────────────────



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

