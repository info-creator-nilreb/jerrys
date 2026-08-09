import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADDRESS_SUGGEST_LIMIT } from "@/lib/address/address-suggest-shared";
import {
  suggestLocalitiesByPostalCode,
  suggestStreets,
} from "@/lib/address/openplz-address-suggest";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("suggestLocalitiesByPostalCode", () => {
  it("mappt Orte und entfernt Duplikate", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { postalCode: "1010", name: "Wien, Innere Stadt" },
        { postalCode: "1010", name: "Wien, Innere Stadt" },
        { postalCode: "1011", name: "Wien" },
      ]),
    );

    const rows = await suggestLocalitiesByPostalCode("AT", "1010");

    expect(rows).toEqual([
      { postalCode: "1010", city: "Wien, Innere Stadt" },
      { postalCode: "1011", city: "Wien" },
    ]);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/at/Localities?");
    expect(url).toContain("postalCode=1010");
  });

  it("begrenzt auf fünf Vorschläge", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        Array.from({ length: 12 }, (_, i) => ({
          postalCode: `1011${i}`,
          name: `Ort ${i}`,
        })),
      ),
    );

    const rows = await suggestLocalitiesByPostalCode("DE", "1011");
    expect(rows).toHaveLength(ADDRESS_SUGGEST_LIMIT);
  });

  it("fragt nicht unterstützte Länder gar nicht ab", async () => {
    const rows = await suggestLocalitiesByPostalCode("FR", "75001");
    expect(rows).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("liefert bei Fehlern eine leere Liste statt eines Fehlers", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    await expect(suggestLocalitiesByPostalCode("DE", "10115")).resolves.toEqual([]);

    fetchMock.mockResolvedValue(jsonResponse({ message: "nope" }, false));
    await expect(suggestLocalitiesByPostalCode("DE", "10115")).resolves.toEqual([]);
  });
});

describe("suggestStreets", () => {
  it("übergibt PLZ und Ort und mappt Straßen", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { name: "Invalidenstr.", postalCode: "10115", locality: "Berlin" },
        { name: "Invalidenstr.", postalCode: "10115", locality: "Berlin" },
        { name: "Invalidenpark", postalCode: "10115", locality: "Berlin" },
      ]),
    );

    const rows = await suggestStreets({
      countryCode: "DE",
      query: "Invaliden",
      postalCode: "10115",
      city: "Berlin",
    });

    expect(rows).toEqual([
      { street: "Invalidenstr.", postalCode: "10115", city: "Berlin" },
      { street: "Invalidenpark", postalCode: "10115", city: "Berlin" },
    ]);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/de/Streets?");
    expect(url).toContain("name=Invaliden");
    expect(url).toContain("postalCode=10115");
    expect(url).toContain("locality=Berlin");
  });

  it("sucht nicht ohne PLZ und ohne Ort", async () => {
    const rows = await suggestStreets({ countryCode: "DE", query: "Haupt" });
    expect(rows).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sucht nicht ohne Suchbegriff", async () => {
    const rows = await suggestStreets({ countryCode: "DE", query: "  ", postalCode: "10115" });
    expect(rows).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
