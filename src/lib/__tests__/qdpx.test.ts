import { describe, it, expect } from "vitest";
import { buildQdeXml, buildZipArchive, extractZipEntries, parseQdeXml } from "@/lib/qdpx";
import type { Project, Document, Code, Segment, Memo } from "@/types";

describe("REFI-QDA (.qdpx / .qde) MAXQDA & NVivo interoperability", () => {
  it("parses MAXQDA/NVivo REFI-QDA 1.0 XML with nested codes, Coding/CodeRef, Variables, Sets, Notes, and external plainTextPath", async () => {
    const qdeXml = `<?xml version="1.0" encoding="utf-8"?>
<Project name="Sociology Study" xmlns="urn:QDA-XML:project:1.0">
  <Description>Fieldwork exported from MAXQDA</Description>
  <CodeBook>
    <Codes>
      <Code guid="c-parent" name="Economic Factors" color="#a78bfa">
        <Description>Macro &amp; household economic conditions</Description>
        <NoteRef targetGUID="n-1" />
        <Code guid="c-child" name="Housing Cost" color="#6ee7b7">
          <Description>Rent and housing burden</Description>
        </Code>
      </Code>
    </Codes>
  </CodeBook>
  <Variables>
    <Variable guid="v-gender" name="Gender" typeOfVariable="Text" />
    <Variable guid="v-age" name="Age" typeOfVariable="Integer" />
  </Variables>
  <Sources>
    <TextSource guid="d-1" name="Interview_P01.txt" plainTextPath="internal://p01.txt">
      <PlainTextSelection guid="s-1" startPosition="0" endPosition="29">
        <Description>Strong quote on rent</Description>
        <Coding guid="cd-1" weight="5">
          <CodeRef targetGUID="c-child" />
        </Coding>
      </PlainTextSelection>
      <VariableValue>
        <VariableRef targetGUID="v-gender" />
        <TextValue>Female</TextValue>
      </VariableValue>
      <VariableValue>
        <VariableRef targetGUID="v-age" />
        <IntegerValue>34</IntegerValue>
      </VariableValue>
    </TextSource>
  </Sources>
  <Notes>
    <Note guid="n-1" name="Economic Theme Memo">
      <PlainTextContent>Emergent pattern across urban interviews.</PlainTextContent>
    </Note>
  </Notes>
  <Sets>
    <Set guid="set-1" name="Urban Participants">
      <MemberSource targetGUID="d-1" />
    </Set>
  </Sets>
</Project>`;

    const p01Text = "Rent takes half of our income every single month.";
    const zipBytes = buildZipArchive([
      { name: "project.qde", data: new TextEncoder().encode(qdeXml) },
      { name: "sources/p01.txt", data: new TextEncoder().encode(p01Text) },
    ]);

    const extracted = await extractZipEntries(zipBytes.buffer as ArrayBuffer);
    expect(extracted.has("project.qde")).toBe(true);
    expect(extracted.has("sources/p01.txt")).toBe(true);

    const parsed = parseQdeXml(new TextDecoder().decode(extracted.get("project.qde")), extracted);

    expect(parsed.project.name).toBe("Sociology Study");
    expect(parsed.codes).toHaveLength(2);
    const parent = parsed.codes.find((c) => c.name === "Economic Factors")!;
    const child = parsed.codes.find((c) => c.name === "Housing Cost")!;
    expect(child.parentId).toBe(parent.id);

    expect(parsed.documents).toHaveLength(1);
    const doc = parsed.documents[0];
    expect(doc.content).toBe(p01Text);
    expect(doc.group).toBe("Urban Participants");
    expect(doc.properties).toEqual({ Gender: "Female", Age: "34" });

    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0].documentId).toBe(doc.id);
    expect(parsed.segments[0].text).toBe("Rent takes half of our income");
    expect(parsed.segments[0].codeIds).toEqual([child.id]);
    expect(parsed.segments[0].memo).toBe("Strong quote on rent");
    expect(parsed.segments[0].weight).toBe(5);

    expect(parsed.memos).toHaveLength(1);
    expect(parsed.memos[0].linkedCodes).toEqual([parent.id]);
  });

  it("round-trips QualityOpen project → QDE XML → parsed project preserving codebook, groups, variables, weights, and memos", () => {
    const project: Project = {
      id: "p1",
      name: "RoundTrip Study",
      description: "Test desc",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    const docs: Document[] = [
      {
        id: "d1",
        projectId: "p1",
        name: "Doc 1",
        content: "Qualitative research reveals deep social patterns.",
        type: "interview",
        tags: [],
        group: "Cohort A",
        properties: { Region: "West" },
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ];
    const codes: Code[] = [
      {
        id: "c1",
        projectId: "p1",
        name: "Social Patterns",
        description: "Recurring behaviors",
        inclusionCriteria: "Mentions group norms",
        exclusionCriteria: "Individual habits",
        exampleQuote: "deep social patterns",
        color: "#a78bfa",
        createdAt: 1700000000000,
      },
    ];
    const segments: Segment[] = [
      {
        id: "s1",
        projectId: "p1",
        documentId: "d1",
        start: 29,
        end: 49,
        text: "deep social patterns",
        codeIds: ["c1"],
        memo: "Key insight",
        weight: 4,
        createdAt: 1700000000000,
      },
    ];
    const memos: Memo[] = [
      {
        id: "m1",
        projectId: "p1",
        title: "Pattern Memo",
        content: "Check across cohorts.",
        linkedCodes: ["c1"],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ];

    const xml = buildQdeXml(project, docs, codes, segments, memos);
    const parsed = parseQdeXml(xml);

    expect(parsed.project.name).toBe("RoundTrip Study");
    expect(parsed.codes[0].inclusionCriteria).toBe("Mentions group norms");
    expect(parsed.codes[0].exclusionCriteria).toBe("Individual habits");
    expect(parsed.codes[0].exampleQuote).toBe("deep social patterns");
    expect(parsed.documents[0].group).toBe("Cohort A");
    expect(parsed.documents[0].properties).toEqual({ Region: "West" });
    expect(parsed.segments[0].weight).toBe(4);
    expect(parsed.segments[0].memo).toBe("Key insight");
    expect(parsed.memos[0].linkedCodes).toEqual([parsed.codes[0].id]);
  });

  it("rejects XML containing DOCTYPE / ENTITY declarations (XXE guard)", () => {
    const malicious = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe "boom">]><Project name="Bad"/>`;
    expect(() => parseQdeXml(malicious)).toThrow(/disallowed DOCTYPE\/ENTITY/i);
  });
});
