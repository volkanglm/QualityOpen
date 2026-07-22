import { describe, it, expect } from "vitest";
import { parseOAuthCallback } from "@/lib/oauthCallback";

describe("parseOAuthCallback", () => {
  it("extracts code and state from a loopback callback", () => {
    const url = "http://127.0.0.1:52345/?code=abc123&state=xyz";
    expect(parseOAuthCallback(url)).toEqual({ code: "abc123", state: "xyz" });
  });

  it("extracts code and state from a custom-scheme callback", () => {
    const url =
      "com.googleusercontent.apps.111-aaa:/oauth2redirect?state=xyz&code=abc123&scope=email";
    expect(parseOAuthCallback(url)).toEqual({ code: "abc123", state: "xyz" });
  });

  it("returns empty state when absent", () => {
    expect(parseOAuthCallback("qualityopen://oauth?code=abc123")).toEqual({
      code: "abc123",
      state: "",
    });
  });

  it("throws when code is missing", () => {
    expect(() => parseOAuthCallback("qualityopen://oauth?state=xyz")).toThrow(
      "No auth code in OAuth callback",
    );
  });
});
