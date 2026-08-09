import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/http/request-pathname";

describe("safeInternalPath", () => {
  it("übernimmt interne Pfade", () => {
    expect(safeInternalPath("/konto/adressen", "/konto")).toBe("/konto/adressen");
    expect(safeInternalPath("/konto/bestellungen?seite=2", "/konto")).toBe(
      "/konto/bestellungen?seite=2",
    );
  });

  it("verhindert Open Redirects", () => {
    expect(safeInternalPath("//evil.example.com", "/konto")).toBe("/konto");
    expect(safeInternalPath("https://evil.example.com", "/konto")).toBe("/konto");
    expect(safeInternalPath("/\\evil.example.com", "/konto")).toBe("/konto");
    expect(safeInternalPath("/konto\nSet-Cookie: x=1", "/konto")).toBe("/konto");
  });

  it("nutzt den Fallback bei fehlendem Wert", () => {
    expect(safeInternalPath(null, "/konto")).toBe("/konto");
    expect(safeInternalPath("   ", "/konto")).toBe("/konto");
    expect(safeInternalPath(undefined, "")).toBe("");
  });
});
