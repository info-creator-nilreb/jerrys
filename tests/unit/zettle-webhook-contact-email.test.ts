import { describe, expect, it } from "vitest";

// Re-export der Validierungslogik indirekt über resolve — hier die Regex-Regeln spiegeln,
// die ensure-zettle-webhook nutzt (kein ops@localhost).
function isValidContactEmail(raw: string | null | undefined): boolean {
  const email = raw?.trim() ?? "";
  if (!email || email.length > 200) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  if (host === "localhost" || host.endsWith(".local") || !host.includes(".")) return false;
  return true;
}

describe("zettle webhook contact email", () => {
  it("akzeptiert normale Domains", () => {
    expect(isValidContactEmail("ops@example.com")).toBe(true);
    expect(isValidContactEmail(" shop@jerrys.de ")).toBe(true);
  });

  it("lehnt localhost und ungültige Werte ab", () => {
    expect(isValidContactEmail("ops@localhost")).toBe(false);
    expect(isValidContactEmail("a@b.local")).toBe(false);
    expect(isValidContactEmail("not-an-email")).toBe(false);
    expect(isValidContactEmail("")).toBe(false);
  });
});
