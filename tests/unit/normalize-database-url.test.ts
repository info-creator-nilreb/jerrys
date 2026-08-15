import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/db/normalize-database-url";

describe("normalizeDatabaseUrl", () => {
  it("entfernt umschließende doppelte Anführungszeichen", () => {
    expect(normalizeDatabaseUrl('"postgresql://host/db"')).toBe("postgresql://host/db");
  });

  it("lässt gültige URLs unverändert", () => {
    const url = "postgresql://postgres:pass@db.example.com:5432/postgres";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  it("gibt undefined für leere Werte zurück", () => {
    expect(normalizeDatabaseUrl(undefined)).toBeUndefined();
    expect(normalizeDatabaseUrl("  ")).toBeUndefined();
  });
});
