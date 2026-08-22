import { describe, expect, it } from "vitest";
import {
  isDraftProductSlug,
  slugFollowsTitle,
  slugifyTitle,
} from "@/lib/slug/slugify-title";

describe("slugifyTitle", () => {
  it("transliteriert Umlaute und normalisiert Leerzeichen", () => {
    expect(slugifyTitle("Design Katzenhöhle")).toBe("design-katzenhoehle");
    expect(slugifyTitle("Größe & Farbe")).toBe("groesse-farbe");
    expect(slugifyTitle("Straße")).toBe("strasse");
  });

  it("entfernt führende und trailing Bindestriche", () => {
    expect(slugifyTitle("  --Test--  ")).toBe("test");
  });

  it("catalog-Modus erlaubt keine Slashes", () => {
    expect(slugifyTitle("Legal/AGB", "catalog")).toBe("legal-agb");
  });

  it("content-Modus behält vorhandene Pfad-Segmente", () => {
    expect(slugifyTitle("legal/agb", "content")).toBe("legal/agb");
  });

  it("liefert leeren String bei leerem Titel", () => {
    expect(slugifyTitle("   ")).toBe("");
  });
});

describe("isDraftProductSlug", () => {
  it("erkennt Entwurfs-Slugs", () => {
    expect(isDraftProductSlug("entwurf-a1b2c3d4e5")).toBe(true);
    expect(isDraftProductSlug("design-katze")).toBe(false);
  });
});

describe("slugFollowsTitle", () => {
  it("behandelt Entwurfs-Slugs als auto-generiert", () => {
    expect(slugFollowsTitle("Neues Produkt", "entwurf-abc123")).toBe(true);
  });

  it("erkennt manuell abweichende Slugs", () => {
    expect(slugFollowsTitle("Design Katzenhöhle", "katzenhoehle")).toBe(false);
    expect(slugFollowsTitle("Design Katzenhöhle", "design-katzenhoehle")).toBe(true);
  });
});
