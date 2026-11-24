/**
 * REFI-QDA (.qdpx / .qde) interchange format
 * Compliant with the Rotterdam Exchange Format Initiative (REFI) QDA-XML 1.0 standard
 * used by MAXQDA, NVivo, ATLAS.ti, QDA Miner, and Dedoose.
 *
 * Supports:
 *   - Reading real .qdpx ZIP archives (including `sources/*.txt` via `plainTextPath="internal://..."`)
 *     AND standalone .qde XML files.
 *   - MAXQDA / NVivo `<PlainTextSelection><Coding><CodeRef targetGUID="..."/></Coding></PlainTextSelection>`
 *   - Nested `<Codes><Code>` hierarchies + Codebook `<Description>`
 *   - `<Variables>` + `<VariableValue>` → `Document.properties`
 *   - `<Sets><Set><MemberSource>` → `Document.group`
 *   - `<Notes><Note>` + `<NoteRef>` → `Memo` with `linkedCodes`
 *   - Exporting a real `.qdpx` ZIP archive containing `project.qde`.
 */

import type { Project, Document, Code, Segment, Memo } from "@/types";
import { CODE_COLORS } from "@/lib/constants";

// ─── Minimal zero-dependency ZIP reader / writer ──────────────────────────────

const CRC32_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[i] = c >>> 0;
  }
  return tbl;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a valid uncompressed (STORE) ZIP archive Uint8Array from name → content pairs. */
export function buildZipArchive(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);

    // Local file header (30 bytes + name)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true);         // version needed
    lv.setUint16(6, 0x0800, true);     // UTF-8 filename flag
    lv.setUint16(8, 0, true);          // method: STORE
    lv.setUint16(10, 0, true);         // mod time
    lv.setUint16(12, 0, true);         // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);

    localParts.push(lh, data);

    // Central directory header (46 bytes + name)
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    centralParts.push(ch);

    offset += lh.length + data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of localParts) { out.set(p, pos); pos += p.length; }
  for (const p of centralParts) { out.set(p, pos); pos += p.length; }
  out.set(eocd, pos);
  return out;
}

const MAX_ZIP_ENTRIES = 500;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB ZIP-bomb cap

async function inflateRaw(compressed: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Deflate decompression is not supported in this runtime.");
  }
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  await writer.write(copy);
  await writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("REFI-QDA archive exceeds maximum safe uncompressed size.");
      }
      chunks.push(value);
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const ch of chunks) {
    out.set(ch, offset);
    offset += ch.byteLength;
  }
  return out;
}

/** Extract all files from a ZIP archive (supports STORE method 0 and DEFLATE method 8). */
export async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map<string, Uint8Array>();
  const decoder = new TextDecoder("utf-8");

  // Locate End of Central Directory (EOCD) record from the end of the file
  let eocdOffset = -1;
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid .qdpx ZIP archive: missing EOCD record.");
  }

  const cdCount = view.getUint16(eocdOffset + 10, true);
  if (cdCount > MAX_ZIP_ENTRIES) {
    throw new Error(`REFI-QDA archive has too many entries (${cdCount} > ${MAX_ZIP_ENTRIES}).`);
  }
  let cdOffset = view.getUint32(eocdOffset + 16, true);
  let totalUncompressed = 0;

  for (let i = 0; i < cdCount; i++) {
    if (cdOffset + 46 > bytes.length) break;
    if (view.getUint32(cdOffset, true) !== 0x02014b50) break;
    const method = view.getUint16(cdOffset + 10, true);
    const compSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    if (cdOffset + 46 + nameLen > bytes.length) {
      throw new Error("Corrupted .qdpx ZIP central directory.");
    }
    const name = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/") || name.includes("..")) continue; // skip directories & traversal paths

    if (localHeaderOffset + 30 > bytes.length) {
      throw new Error("Corrupted .qdpx ZIP local header offset.");
    }
    const lhNameLen = view.getUint16(localHeaderOffset + 26, true);
    const lhExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    if (dataStart + compSize > bytes.length) {
      throw new Error("Corrupted .qdpx ZIP entry bounds.");
    }
    const rawData = bytes.subarray(dataStart, dataStart + compSize);
    const remainingBudget = MAX_UNCOMPRESSED_BYTES - totalUncompressed;

    if (method === 0) {
      if (rawData.byteLength > remainingBudget) {
        throw new Error("REFI-QDA archive exceeds maximum safe uncompressed size.");
      }
      totalUncompressed += rawData.byteLength;
      entries.set(name, rawData.slice());
    } else if (method === 8) {
      const inflated = await inflateRaw(rawData, remainingBudget);
      totalUncompressed += inflated.byteLength;
      entries.set(name, inflated);
    }
  }

  return entries;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportQdpx(
  project: Project,
  documents: Document[],
  codes: Code[],
  segments: Segment[],
  memos: Memo[],
): Promise<void> {
  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const projectCodes = codes.filter((c) => c.projectId === project.id);
  const projectSegs = segments.filter((s) => s.projectId === project.id);
  const projectMemos = memos.filter((m) => m.projectId === project.id);

  const xml = buildQdeXml(project, projectDocs, projectCodes, projectSegs, projectMemos);
  const zipBytes = buildZipArchive([
    { name: "project.qde", data: new TextEncoder().encode(xml) },
  ]);

  const safeName = `${project.name.replace(/[^a-z0-9_-]/gi, "_")}.qdpx`;

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: safeName,
      filters: [{ name: "REFI-QDA Project", extensions: ["qdpx"] }],
    });
    if (!filePath) return;
    await writeFile(filePath, zipBytes);
  } catch {
    const copy = new Uint8Array(zipBytes.byteLength);
    copy.set(zipBytes);
    const blob = new Blob([copy.buffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── XML builder (REFI-QDA 1.0 compliant) ─────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildQdeXml(
  project: Project,
  documents: Document[],
  codes: Code[],
  segments: Segment[],
  memos: Memo[],
): string {
  const now = new Date().toISOString();

  // Collect all unique document property keys as REFI-QDA Variables
  const varNameToGuid = new Map<string, string>();
  for (const d of documents) {
    for (const k of Object.keys(d.properties ?? {})) {
      if (!varNameToGuid.has(k)) {
        varNameToGuid.set(k, `var-${k.replace(/[^a-z0-9_-]/gi, "_")}`);
      }
    }
  }

  const variablesXml = Array.from(varNameToGuid.entries())
    .map(([name, guid]) => `    <Variable guid="${esc(guid)}" name="${esc(name)}" typeOfVariable="Text" />`)
    .join("\n");

  const codesXml = buildCodeTree(codes, memos);

  const sourcesXml = documents
    .map((doc) => {
      const docSegs = segments.filter((s) => s.documentId === doc.id);
      const selectionsXml = docSegs
        .filter((s) => s.codeIds.length > 0 || Boolean(s.memo?.trim()))
        .map((seg) => {
          const codings = seg.codeIds
            .map(
              (cid) =>
                `        <Coding guid="${seg.id}-${cid}" creatingUser="QualityOpen" creationDateTime="${new Date(seg.createdAt).toISOString()}"${seg.weight ? ` weight="${seg.weight}"` : ""}>\n          <CodeRef targetGUID="${cid}" />\n        </Coding>`
            )
            .join("\n");
          const desc = seg.memo ? `\n        <Description>${esc(seg.memo)}</Description>` : "";
          return `      <PlainTextSelection guid="${seg.id}" startPosition="${seg.start}" endPosition="${seg.end}" creatingUser="QualityOpen" creationDateTime="${new Date(seg.createdAt).toISOString()}">${desc}${codings ? `\n${codings}` : ""}\n      </PlainTextSelection>`;
        })
        .join("\n");

      const varValuesXml = Object.entries(doc.properties ?? {})
        .map(([k, v]) => {
          const vGuid = varNameToGuid.get(k);
          if (!vGuid) return "";
          return `      <VariableValue>\n        <VariableRef targetGUID="${esc(vGuid)}" />\n        <TextValue>${esc(v)}</TextValue>\n      </VariableValue>`;
        })
        .filter(Boolean)
        .join("\n");

      return `    <TextSource guid="${doc.id}" name="${esc(doc.name)}" creatingUser="QualityOpen" creationDateTime="${new Date(doc.createdAt).toISOString()}">
      <PlainTextContent>${esc(doc.content)}</PlainTextContent>
${selectionsXml}
${varValuesXml}
    </TextSource>`;
    })
    .join("\n");

  const notesXml = memos
    .map(
      (m) => `    <Note guid="${m.id}" name="${esc(m.title)}" creatingUser="QualityOpen" creationDateTime="${new Date(m.createdAt).toISOString()}">
      <PlainTextContent>${esc(m.content)}</PlainTextContent>
    </Note>`
    )
    .join("\n");

  // Group documents by Document.group → REFI-QDA <Sets>
  const groupMap = new Map<string, string[]>();
  for (const doc of documents) {
    if (doc.group?.trim()) {
      const g = doc.group.trim();
      const arr = groupMap.get(g) ?? [];
      arr.push(doc.id);
      groupMap.set(g, arr);
    }
  }
  const setsXml = Array.from(groupMap.entries())
    .map(
      ([groupName, docIds], idx) => `    <Set guid="set-${idx + 1}" name="${esc(groupName)}">
${docIds.map((id) => `      <MemberSource targetGUID="${id}" />`).join("\n")}
    </Set>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<Project name="${esc(project.name)}" origin="QualityOpen" creatingUser="QualityOpen" creationDateTime="${new Date(project.createdAt).toISOString()}" modifiedDateTime="${now}" xmlns="urn:QDA-XML:project:1.0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Description>${esc(project.description ?? "")}</Description>
  <CodeBook>
    <Codes>
${codesXml}
    </Codes>
  </CodeBook>
  <Variables>
${variablesXml}
  </Variables>
  <Sources>
${sourcesXml}
  </Sources>
  <Notes>
${notesXml}
  </Notes>
  <Sets>
${setsXml}
  </Sets>
</Project>`;
}

function buildCodeTree(codes: Code[], memos: Memo[], parentId?: string, depth = 0): string {
  const indent = "  ".repeat(depth + 3);
  return codes
    .filter((c) => c.parentId === parentId)
    .map((code) => {
      const children = buildCodeTree(codes, memos, code.id, depth + 1);
      const hex = code.color.replace("#", "");
      const descParts = [
        code.description?.trim(),
        code.inclusionCriteria?.trim() ? `Inclusion: ${code.inclusionCriteria.trim()}` : "",
        code.exclusionCriteria?.trim() ? `Exclusion: ${code.exclusionCriteria.trim()}` : "",
        code.exampleQuote?.trim() ? `Example: ${code.exampleQuote.trim()}` : "",
      ].filter(Boolean);
      const descXml = descParts.length
        ? `\n${indent}  <Description>${esc(descParts.join("\n"))}</Description>`
        : "";
      const noteRefsXml = memos
        .filter((m) => m.linkedCodes?.includes(code.id))
        .map((m) => `\n${indent}  <NoteRef targetGUID="${m.id}" />`)
        .join("");
      const inner = `${descXml}${noteRefsXml}${children ? `\n${children}` : ""}`;
      return `${indent}<Code guid="${code.id}" name="${esc(code.name)}" isCodable="true" color="#${hex}" creatingUser="QualityOpen" creationDateTime="${new Date(code.createdAt).toISOString()}">${inner ? `${inner}\n${indent}` : ""}</Code>`;
    })
    .join("\n");
}

// ─── Import (MAXQDA / NVivo / ATLAS.ti REFI-QDA 1.0 compatible) ───────────────

export interface QdpxImportedDocument
  extends Omit<Document, "id" | "projectId" | "createdAt" | "updatedAt"> {
  id: string;
}

export interface QdpxImportedCode extends Omit<Code, "id" | "projectId" | "createdAt"> {
  id: string;
}

export interface QdpxImportedSegment
  extends Omit<Segment, "id" | "projectId" | "createdAt"> {
  id: string;
}

export interface QdpxImportedMemo
  extends Omit<Memo, "id" | "projectId" | "createdAt" | "updatedAt"> {
  id: string;
}

export interface QdpxImport {
  project: Omit<Project, "id" | "createdAt" | "updatedAt">;
  documents: QdpxImportedDocument[];
  codes: QdpxImportedCode[];
  segments: QdpxImportedSegment[];
  memos: QdpxImportedMemo[];
  guidMap: {
    documents: Record<string, string>;
    codes: Record<string, string>;
  };
}

/** Return direct child elements matching localName (namespace-agnostic). */
function directChildrenByLocalName(el: Element, localName: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === localName);
}

function firstDirectChildText(el: Element, localName: string): string | undefined {
  const child = directChildrenByLocalName(el, localName)[0];
  const txt = child?.textContent?.trim();
  return txt ? txt : undefined;
}

function elementsByLocalName(root: Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagName("*")).filter((el) => el.localName === localName);
}

function parseCodebookDescription(raw?: string): {
  description?: string;
  inclusionCriteria?: string;
  exclusionCriteria?: string;
  exampleQuote?: string;
} {
  if (!raw) return {};
  const lines = raw.split(/\r?\n/);
  const descLines: string[] = [];
  let inclusionCriteria: string | undefined;
  let exclusionCriteria: string | undefined;
  let exampleQuote: string | undefined;

  for (const line of lines) {
    if (line.startsWith("Inclusion:")) {
      inclusionCriteria = line.slice("Inclusion:".length).trim();
    } else if (line.startsWith("Exclusion:")) {
      exclusionCriteria = line.slice("Exclusion:".length).trim();
    } else if (line.startsWith("Example:")) {
      exampleQuote = line.slice("Example:".length).trim();
    } else {
      descLines.push(line);
    }
  }
  const description = descLines.join("\n").trim() || undefined;
  return { description, inclusionCriteria, exclusionCriteria, exampleQuote };
}

/**
 * Parse a REFI-QDA 1.0 `project.qde` XML string (optionally with ZIP entries for
 * `plainTextPath="internal://..."` external text files used by MAXQDA & NVivo).
 */
export function parseQdeXml(
  xmlText: string,
  zipEntries?: Map<string, Uint8Array>,
): QdpxImport {
  // Strip UTF-8 BOM if present and reject DOCTYPE/ENTITY declarations (XXE / entity-expansion guard)
  const cleanXml = xmlText.replace(/^\uFEFF/, "");
  if (/<!(?:DOCTYPE|ENTITY)\b/i.test(cleanXml)) {
    throw new Error("REFI-QDA XML contains disallowed DOCTYPE/ENTITY declarations.");
  }
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(cleanXml, "application/xml");
  const root = xmlDoc.documentElement;
  if (!root || root.localName === "parsererror") {
    throw new Error("Invalid REFI-QDA XML file.");
  }

  const projectName = root.getAttribute("name") ?? "Imported REFI-QDA Project";
  const projectDesc = firstDirectChildText(root, "Description") ?? "";

  // 1. Parse Variables lookup (guid → variable name)
  const varGuidToName: Record<string, string> = {};
  for (const vEl of elementsByLocalName(root, "Variable")) {
    const guid = vEl.getAttribute("guid");
    const name = vEl.getAttribute("name");
    if (guid && name) varGuidToName[guid] = name;
  }

  // 2. Parse Sets / Document Groups lookup (docGuid → group name)
  const docGuidToGroup: Record<string, string> = {};
  for (const setEl of elementsByLocalName(root, "Set")) {
    const setName = setEl.getAttribute("name")?.trim();
    if (!setName) continue;
    for (const member of directChildrenByLocalName(setEl, "MemberSource")) {
      const target = member.getAttribute("targetGUID");
      if (target && !docGuidToGroup[target]) {
        docGuidToGroup[target] = setName;
      }
    }
  }

  // 3. Parse Notes lookup (noteGuid → Memo)
  const noteGuidToId: Record<string, string> = {};
  const noteIdToCodeIds: Record<string, Set<string>> = {};
  const parsedMemos: QdpxImportedMemo[] = [];
  for (const noteEl of elementsByLocalName(root, "Note")) {
    const guid = noteEl.getAttribute("guid") ?? crypto.randomUUID();
    const newId = crypto.randomUUID();
    noteGuidToId[guid] = newId;
    noteIdToCodeIds[newId] = new Set();
    const content =
      firstDirectChildText(noteEl, "PlainTextContent") ??
      firstDirectChildText(noteEl, "Description") ??
      "";
    parsedMemos.push({
      id: newId,
      title: noteEl.getAttribute("name") ?? "Note",
      content,
    });
  }

  // 4. Parse Codes (recursive hierarchy, colors, codebook descriptions, linked notes)
  const codeEls = elementsByLocalName(root, "Code");
  const codeGuidMap: Record<string, string> = {};
  const parsedCodes: QdpxImportedCode[] = [];

  codeEls.forEach((el, idx) => {
    const guid = el.getAttribute("guid") ?? crypto.randomUUID();
    const newId = crypto.randomUUID();
    codeGuidMap[guid] = newId;

    const rawColor = el.getAttribute("color");
    const color =
      rawColor && /^#[0-9a-fA-F]{6}$/.test(rawColor)
        ? rawColor
        : CODE_COLORS[idx % CODE_COLORS.length];

    const parsedDesc = parseCodebookDescription(firstDirectChildText(el, "Description"));

    // Wire <NoteRef targetGUID="..." /> on <Code> to Memo.linkedCodes
    for (const nr of directChildrenByLocalName(el, "NoteRef")) {
      const targetNoteGuid = nr.getAttribute("targetGUID");
      if (targetNoteGuid && noteGuidToId[targetNoteGuid]) {
        noteIdToCodeIds[noteGuidToId[targetNoteGuid]].add(newId);
      }
    }

    parsedCodes.push({
      id: newId,
      name: el.getAttribute("name") ?? "Code",
      color,
      parentId: undefined,
      ...parsedDesc,
    });
  });

  // Resolve code parent hierarchy
  codeEls.forEach((el, idx) => {
    const parent = el.parentElement;
    if (parent && parent.localName === "Code") {
      const parentGuid = parent.getAttribute("guid");
      if (parentGuid && codeGuidMap[parentGuid]) {
        parsedCodes[idx].parentId = codeGuidMap[parentGuid];
      }
    }
  });

  // Attach linkedCodes to memos
  for (const memo of parsedMemos) {
    const linked = Array.from(noteIdToCodeIds[memo.id] ?? []);
    if (linked.length > 0) memo.linkedCodes = linked;
  }

  // 5. Parse TextSources (documents + variables + coded selections)
  const sourceEls = elementsByLocalName(root, "TextSource");
  const docGuidMap: Record<string, string> = {};
  const parsedDocs: QdpxImportedDocument[] = [];
  const parsedSegs: QdpxImportedSegment[] = [];
  const decoder = new TextDecoder("utf-8");

  for (const el of sourceEls) {
    const guid = el.getAttribute("guid") ?? crypto.randomUUID();
    const newDocId = crypto.randomUUID();
    docGuidMap[guid] = newDocId;

    // Content can be inline <PlainTextContent> OR external `plainTextPath="internal://..."` (MAXQDA/NVivo)
    let content = firstDirectChildText(el, "PlainTextContent") ?? "";
    if (!content && zipEntries) {
      const plainPath = el.getAttribute("plainTextPath") ?? "";
      if (plainPath) {
        const cleaned = plainPath.replace(/^internal:\/\//i, "").replace(/^\/+/, "");
        const candidateKeys = [cleaned, `sources/${cleaned}`, `Sources/${cleaned}`];
        for (const key of candidateKeys) {
          const fileBytes = zipEntries.get(key);
          if (fileBytes) {
            content = decoder.decode(fileBytes).replace(/^\uFEFF/, "");
            break;
          }
        }
      }
    }

    // Parse VariableValues → Document.properties
    const properties: Record<string, string> = {};
    for (const vvEl of directChildrenByLocalName(el, "VariableValue")) {
      const refGuid = directChildrenByLocalName(vvEl, "VariableRef")[0]?.getAttribute("targetGUID");
      const varName = refGuid ? varGuidToName[refGuid] : undefined;
      const val =
        firstDirectChildText(vvEl, "TextValue") ??
        firstDirectChildText(vvEl, "IntegerValue") ??
        firstDirectChildText(vvEl, "FloatValue") ??
        firstDirectChildText(vvEl, "BooleanValue") ??
        firstDirectChildText(vvEl, "DateValue") ??
        firstDirectChildText(vvEl, "DateTimeValue");
      if (varName && val !== undefined) {
        properties[varName] = val;
      }
    }

    parsedDocs.push({
      id: newDocId,
      name: el.getAttribute("name") ?? "Document",
      content,
      format: "text",
      type: "document",
      tags: [],
      group: docGuidToGroup[guid],
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    });

    // Parse PlainTextSelection (handles both <Coding><CodeRef/> and direct <CodeRef/>)
    for (const sel of directChildrenByLocalName(el, "PlainTextSelection")) {
      const start = Math.max(0, parseInt(sel.getAttribute("startPosition") ?? "0", 10) || 0);
      const end = Math.max(start, parseInt(sel.getAttribute("endPosition") ?? "0", 10) || start);

      const codeRefSet = new Set<string>();
      let weight: number | undefined;

      for (const codingEl of directChildrenByLocalName(sel, "Coding")) {
        const rawW = codingEl.getAttribute("weight");
        if (rawW) {
          const parsedW = parseInt(rawW, 10);
          if (parsedW >= 1 && parsedW <= 5) weight = parsedW;
        }
        for (const cr of directChildrenByLocalName(codingEl, "CodeRef")) {
          const mapped = codeGuidMap[cr.getAttribute("targetGUID") ?? ""];
          if (mapped) codeRefSet.add(mapped);
        }
      }
      // Also support direct <CodeRef> children (legacy QualityOpen exports)
      for (const cr of directChildrenByLocalName(sel, "CodeRef")) {
        const mapped = codeGuidMap[cr.getAttribute("targetGUID") ?? ""];
        if (mapped) codeRefSet.add(mapped);
      }

      const memo = firstDirectChildText(sel, "Description");
      const codeIds = Array.from(codeRefSet);
      if (codeIds.length === 0 && !memo) continue;

      parsedSegs.push({
        id: crypto.randomUUID(),
        documentId: newDocId,
        start,
        end,
        text: content.slice(start, end),
        codeIds,
        memo,
        ...(weight ? { weight } : {}),
      });
    }
  }

  return {
    project: { name: projectName, description: projectDesc },
    documents: parsedDocs,
    codes: parsedCodes,
    segments: parsedSegs,
    memos: parsedMemos,
    guidMap: { documents: docGuidMap, codes: codeGuidMap },
  };
}

/**
 * Import a REFI-QDA file (`.qdpx` ZIP archive from MAXQDA/NVivo/ATLAS.ti or `.qde` XML).
 */
export async function importQdpx(file: File): Promise<QdpxImport> {
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  const isZip = header[0] === 0x50 && header[1] === 0x4b; // "PK" ZIP magic bytes

  if (isZip) {
    const entries = await extractZipEntries(buffer);
    let qdeBytes: Uint8Array | undefined;
    for (const [name, data] of entries.entries()) {
      if (name.toLowerCase().endsWith(".qde")) {
        qdeBytes = data;
        break;
      }
    }
    if (!qdeBytes) {
      throw new Error("No project.qde file found inside .qdpx archive.");
    }
    const xmlText = new TextDecoder("utf-8").decode(qdeBytes);
    return parseQdeXml(xmlText, entries);
  }

  const xmlText = new TextDecoder("utf-8").decode(buffer);
  return parseQdeXml(xmlText);
}
