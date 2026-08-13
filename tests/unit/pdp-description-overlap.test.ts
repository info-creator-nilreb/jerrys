import { describe, expect, it } from "vitest";
import { isProductDescriptionRedundantWithLead } from "@/lib/catalog/pdp-description-overlap";

describe("isProductDescriptionRedundantWithLead", () => {
  it("erkennt gleiche Texte", () => {
    expect(
      isProductDescriptionRedundantWithLead(
        "<p>Robuste Katzenhöhle mit zeitlosem Look</p>",
        "Robuste Katzenhöhle mit zeitlosem Look",
      ),
    ).toBe(true);
  });

  it("erkennt leichte Umformulierungen", () => {
    expect(
      isProductDescriptionRedundantWithLead(
        "<p>Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug und Kuscheln.</p>",
        "Robuste Katzenhöhle mit zeitlosem Look – made in Germany. Ideal für Rückzug, Entspannung und süße Träume.",
      ),
    ).toBe(true);
  });

  it("lässt längere, andere Beschreibungen durch", () => {
    expect(
      isProductDescriptionRedundantWithLead(
        "<p>Kurzer Teaser.</p><p>Hier folgen Materialdetails, Pflegehinweise und Maße in mehreren Absätzen für den Kunden.</p>",
        "Kurzer Teaser.",
      ),
    ).toBe(false);
  });
});
