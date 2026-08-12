import { describe, expect, it } from "vitest";
import { deleteProducts, setProductsActive } from "@/features/catalog";

describe("product admin lifecycle", () => {
  it("leere Auswahl aktivieren → Fehler ohne DB", async () => {
    const result = await setProductsActive([], true);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Produkte/i);
  });

  it("leere Auswahl löschen → Fehler ohne DB", async () => {
    const result = await deleteProducts(["", "  "]);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Produkte/i);
  });
});
