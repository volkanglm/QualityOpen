import { describe, it, expect, vi } from "vitest";

// ── Stub Tauri/store/firebase deps that fileImport.ts pulls in transitively ──
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-store", () => ({ Store: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));
vi.mock("@/lib/db", () => ({ writeSnapshotToDb: vi.fn() }));
vi.mock("@/store/license.store", () => ({
  useLicenseStore: { getState: () => ({ isPro: true }) },
}));
vi.mock("@/store/app.store", () => ({
  useAppStore: Object.assign(vi.fn(() => ({})), {
    getState: () => ({ language: "en" }),
    setState: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

import { getFileCategory, ACCEPTED_EXTENSIONS } from "@/lib/fileImport";

function makeFile(name: string, type = ""): File {
  return new File([""], name, { type });
}

describe("getFileCategory", () => {
  it("detects video by mime type", () => {
    expect(getFileCategory(makeFile("clip.mp4", "video/mp4"))).toBe("video");
    expect(getFileCategory(makeFile("clip.webm", "video/webm"))).toBe("video");
  });

  it("detects image by mime type", () => {
    expect(getFileCategory(makeFile("photo.jpg", "image/jpeg"))).toBe("image");
    expect(getFileCategory(makeFile("icon.png", "image/png"))).toBe("image");
  });

  it("detects audio by mime type", () => {
    expect(getFileCategory(makeFile("track.mp3", "audio/mpeg"))).toBe("audio");
  });

  it("falls back to extension when mime type is empty", () => {
    expect(getFileCategory(makeFile("video.mov"))).toBe("video");
    expect(getFileCategory(makeFile("photo.jpg"))).toBe("image");
    expect(getFileCategory(makeFile("sound.mp3"))).toBe("audio");
    expect(getFileCategory(makeFile("report.pdf"))).toBe("text");
    expect(getFileCategory(makeFile("data.csv"))).toBe("text");
  });

  it("returns 'text' for unknown extensions", () => {
    expect(getFileCategory(makeFile("file.xyz"))).toBe("text");
    expect(getFileCategory(makeFile("noextension"))).toBe("text");
  });
});

describe("ACCEPTED_EXTENSIONS", () => {
  it("includes common document formats", () => {
    expect(ACCEPTED_EXTENSIONS).toContain(".pdf");
    expect(ACCEPTED_EXTENSIONS).toContain(".docx");
    expect(ACCEPTED_EXTENSIONS).toContain(".txt");
    expect(ACCEPTED_EXTENSIONS).toContain(".csv");
  });

  it("includes video formats", () => {
    expect(ACCEPTED_EXTENSIONS).toContain(".mp4");
    expect(ACCEPTED_EXTENSIONS).toContain(".mov");
  });

  it("includes image formats", () => {
    expect(ACCEPTED_EXTENSIONS).toContain(".jpg");
    expect(ACCEPTED_EXTENSIONS).toContain(".png");
  });
});
