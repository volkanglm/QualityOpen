import { describe, it, expect } from "vitest";
import { xorEncode, xorDecode, SETTINGS_CIPHER } from "@/lib/crypto";

describe("xorEncode / xorDecode", () => {
  it("roundtrip: encode then decode returns original string", () => {
    const original = "sk-abc123XYZ";
    const encoded = xorEncode(original, SETTINGS_CIPHER);
    expect(xorDecode(encoded, SETTINGS_CIPHER)).toBe(original);
  });

  it("produces a different string than the input", () => {
    const original = "my-api-key";
    const encoded = xorEncode(original, SETTINGS_CIPHER);
    expect(encoded).not.toBe(original);
  });

  it("output is valid base64 (no decode throws)", () => {
    const encoded = xorEncode("hello world", SETTINGS_CIPHER);
    expect(() => atob(encoded)).not.toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(xorEncode("", SETTINGS_CIPHER)).toBe("");
    expect(xorDecode("", SETTINGS_CIPHER)).toBe("");
  });

  it("different ciphers produce different outputs", () => {
    const s = "test-key";
    const a = xorEncode(s, "cipher-a");
    const b = xorEncode(s, "cipher-b");
    expect(a).not.toBe(b);
  });

  it("decoding with wrong cipher does not return original", () => {
    const encoded = xorEncode("secret", "correct-cipher");
    const wrong = xorDecode(encoded, "wrong-cipher");
    expect(wrong).not.toBe("secret");
  });

  it("handles ASCII-only strings correctly", () => {
    const original = "merhaba dunya hello-world_123";
    const encoded = xorEncode(original, SETTINGS_CIPHER);
    expect(xorDecode(encoded, SETTINGS_CIPHER)).toBe(original);
  });

  it("known limitation: multi-byte unicode (emoji, accented chars) is not supported", () => {
    // btoa/atob only handles Latin-1; the XOR impl does not encode to UTF-8 bytes first.
    // API keys are always ASCII so this is acceptable for the current use-case.
    const encoded = xorEncode("dünya 🌍", SETTINGS_CIPHER);
    // encoded will be empty string or truncated — we just verify it does not throw
    expect(typeof encoded).toBe("string");
  });
});
