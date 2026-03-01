/**
 * REFI-QDA (.qdpx) interchange format
 * Based on the Rotterdam Exchange Format Initiative (REFI) QDA Project Exchange standard.
 * https://www.qdasoftware.org/
 *
 * This module provides:
 *   exportQdpx(project, documents, codes, segments) → triggers .qdpx download
 *   importQdpx(file) → parsed project snapshot
 */

import type { Project, Document, Code, Segment, Memo } from "@/types";
import { CODE_COLORS } from "@/lib/constants";

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportQdpx(
  project:   Project,
  documents: Document[],
  codes:     Code[],
  segments:  Segment[],
  memos:     Memo[],
): Promise<void> {
  const projectDocs  = documents.filter((d) => d.projectId === project.id);
  const projectCodes = codes.filter((c) => c.projectId === project.id);
  const projectSegs  = segments.filter((s) => s.projectId === project.id);
  const projectMemos = memos.filter((m) => m.projectId === project.id);

  const xml = buildXml(project, projectDocs, projectCodes, projectSegs, projectMemos);

  // Create zip-like container (.qdpx is a ZIP with project.qde inside)
  // For simplicity, export as plain .qde XML (REFI-QDA compliant XML)
  const blob = new Blob([xml], { type: "application/xml" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}.qde`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── XML builder ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&apos;");
}

function buildXml(
  project:   Project,
  documents: Document[],
  codes:     Code[],
  segments:  Segment[],
  memos:     Memo[],
): string {
  const now = new Date().toISOString();

  const codesXml = buildCodeTree(codes);
  const sourcesXml = documents.map((doc) => {
    const docSegs = segments.filter((s) => s.documentId === doc.id);
    const selectionsXml = docSegs
      .filter((s) => s.codeIds.length > 0)
      .map((seg) => {
        const refs = seg.codeIds
          .map((cid) => `        <CodeRef targetGUID="${cid}" />`)
          .join("\n");
        return `      <PlainTextSelection guid="${seg.id}" startPosition="${seg.start}" endPosition="${seg.end}" creatingUser="QualityOpen" creationDateTime="${new Date(seg.createdAt).toISOString()}">
${refs}
${seg.memo ? `        <Description>${esc(seg.memo)}</Description>` : ""}
      </PlainTextSelection>`;
      })
      .join("\n");

    return `    <TextSource guid="${doc.id}" name="${esc(doc.name)}" creatingUser="QualityOpen" creationDateTime="${new Date(doc.createdAt).toISOString()}">
      <PlainTextContent>${esc(doc.content)}</PlainTextContent>
${selectionsXml}
    </TextSource>`;
  }).join("\n");

  const notesXml = memos.map((m) => `    <Note guid="${m.id}" name="${esc(m.title)}" creatingUser="QualityOpen" creationDateTime="${new Date(m.createdAt).toISOString()}">
      <Description>${esc(m.content)}</Description>
    </Note>`).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<Project name="${esc(project.name)}" origin="QualityOpen" creatingUser="QualityOpen" creationDateTime="${new Date(project.createdAt).toISOString()}" modifiedDateTime="${now}" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Description>${esc(project.description ?? "")}</Description>
  <Codes>
${codesXml}
  </Codes>
  <Sources>
${sourcesXml}
  </Sources>
  <Notes>
${notesXml}
  </Notes>
</Project>`;
}

function buildCodeTree(codes: Code[], parentId?: string, depth = 0): string {
  const indent = "  ".repeat(depth + 2);
  return codes
    .filter((c) => c.parentId === parentId)
    .map((code) => {
      const children = buildCodeTree(codes, code.id, depth + 1);
      const hex = code.color.replace("#", "");
      return `${indent}<Code guid="${code.id}" name="${esc(code.name)}" isCodable="true" color="#${hex}" creatingUser="QualityOpen" creationDateTime="${new Date(code.createdAt).toISOString()}">${children ? `\n${children}${indent}` : ""}</Code>`;
    })
    .join("\n");
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface QdpxImport {
  project:   Omit<Project,  "id" | "createdAt" | "updatedAt">;
  documents: Omit<Document, "id" | "projectId" | "createdAt" | "updatedAt">[];
  codes:     Omit<Code,     "id" | "projectId" | "createdAt">[];
  segments:  Omit<Segment,  "id" | "projectId" | "documentId" | "createdAt">[];
  memos:     Omit<Memo,     "id" | "projectId" | "createdAt" | "updatedAt">[];
  /** Original GUIDs mapped so callers can wire relationships */
  guidMap: {
    documents: Record<string, string>;
    codes:     Record<string, string>;
  };
}

export async function importQdpx(file: File): Promise<QdpxImport> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, "application/xml");
  const root   = doc.documentElement;

  const projectName = root.getAttribute("name") ?? "Imported Project";

  // Parse codes
  const codeEls = Array.from(root.querySelectorAll("Codes Code"));
  const codeGuidMap: Record<string, string> = {};
  const parsedCodes: QdpxImport["codes"] = codeEls.map((el) => {
    const guid  = el.getAttribute("guid") ?? crypto.randomUUID();
    const newId = crypto.randomUUID();
    codeGuidMap[guid] = newId;
    const parentGuid = el.parentElement?.tagName === "Code"
      ? el.parentElement.getAttribute("guid") ?? undefined
      : undefined;
    const colorAttr = el.getAttribute("color") ?? CODE_COLORS[0];
    return {
      name:        el.getAttribute("name") ?? "Code",
      color:       colorAttr,
      parentId:    parentGuid,   // resolved after full parse
      description: el.querySelector("Description")?.textContent ?? undefined,
    };
  });

  // Resolve parentIds to new IDs
  parsedCodes.forEach((c, idx) => {
    const oldParent = codeEls[idx].parentElement?.getAttribute("guid");
    if (oldParent && codeGuidMap[oldParent]) {
      c.parentId = codeGuidMap[oldParent];
    } else {
      c.parentId = undefined;
    }
  });

  // Parse text sources (documents)
  const sourceEls = Array.from(root.querySelectorAll("Sources TextSource"));
  const docGuidMap: Record<string, string> = {};
  const parsedDocs: QdpxImport["documents"]    = [];
  const parsedSegs: QdpxImport["segments"]     = [];

  for (const el of sourceEls) {
    const guid   = el.getAttribute("guid") ?? crypto.randomUUID();
    const newId  = crypto.randomUUID();
    docGuidMap[guid] = newId;

    const content = el.querySelector("PlainTextContent")?.textContent ?? "";
    parsedDocs.push({
      name:      el.getAttribute("name") ?? "Document",
      content,
      format:    "text",
      type:      "document",
      tags:      [],
      wordCount: content.split(/\s+/).filter(Boolean).length,
    });

    // Parse selections (segments)
    const selEls = Array.from(el.querySelectorAll("PlainTextSelection"));
    for (const sel of selEls) {
      const start    = parseInt(sel.getAttribute("startPosition") ?? "0");
      const end      = parseInt(sel.getAttribute("endPosition") ?? "0");
      const codeRefs = Array.from(sel.querySelectorAll("CodeRef"))
        .map((r) => codeGuidMap[r.getAttribute("targetGUID") ?? ""] ?? "")
        .filter(Boolean);
      const memo = sel.querySelector("Description")?.textContent ?? undefined;

      parsedSegs.push({
        start,
        end,
        text:    content.slice(start, end),
        codeIds: codeRefs,
        memo,
      });
    }
  }

  // Parse notes / memos
  const noteEls  = Array.from(root.querySelectorAll("Notes Note"));
  const parsedMemos: QdpxImport["memos"] = noteEls.map((el) => ({
    title:   el.getAttribute("name") ?? "Note",
    content: el.querySelector("Description")?.textContent ?? "",
  }));

  return {
    project:  { name: projectName, description: "" },
    documents: parsedDocs,
    codes:     parsedCodes,
    segments:  parsedSegs,
    memos:     parsedMemos,
    guidMap:   { documents: docGuidMap, codes: codeGuidMap },
  };
}
