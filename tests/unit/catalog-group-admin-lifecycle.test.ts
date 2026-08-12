import { describe, expect, it } from "vitest";
import {
  deleteCategories,
  deleteCollections,
  setCategoriesActive,
  setCollectionsActive,
} from "@/features/catalog/server";

describe("catalog group admin lifecycle", () => {
  it("leere Kategorien aktivieren → Fehler ohne DB", async () => {
    const result = await setCategoriesActive([], true);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Kategorien/i);
  });

  it("leere Kategorien löschen → Fehler ohne DB", async () => {
    const result = await deleteCategories(["", "  "]);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Kategorien/i);
  });

  it("leere Kollektionen aktivieren → Fehler ohne DB", async () => {
    const result = await setCollectionsActive([], true);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Kollektionen/i);
  });

  it("leere Kollektionen löschen → Fehler ohne DB", async () => {
    const result = await deleteCollections(["", "  "]);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Keine Kollektionen/i);
  });
});
