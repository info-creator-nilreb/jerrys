import { describe, expect, it } from "vitest";
import {
  INTERNETMARKE_PRESET_MAX,
  addInternetmarkeProductPreset,
  findInternetmarkeProductPreset,
  mergeLegacyInternetmarkeProduct,
  parseInternetmarkeProductPresets,
  removeInternetmarkeProductPreset,
  withUpdatedInternetmarkePresetPrice,
  type InternetmarkeProductPreset,
} from "@/features/fulfillment";

const brief = {
  productCode: 1,
  name: "Standardbrief",
  priceCents: 95,
  transport: "national" as const,
  maxWeightG: 20,
};

const ware = {
  productCode: 290,
  name: "Warensendung",
  priceCents: 270,
  transport: "national" as const,
  maxWeightG: 1000,
};

describe("parseInternetmarkeProductPresets", () => {
  it("parst gültige Einträge und entfernt Duplikate", () => {
    const parsed = parseInternetmarkeProductPresets([
      brief,
      { ...brief, name: "Duplikat" },
      ware,
      { productCode: -1, name: "x", priceCents: 10 },
    ]);
    expect(parsed).toEqual([brief, ware]);
  });

  it("begrenzt auf maximal 5", () => {
    const raw = Array.from({ length: 8 }, (_, i) => ({
      productCode: i + 1,
      name: `P${i + 1}`,
      priceCents: 100 + i,
    }));
    expect(parseInternetmarkeProductPresets(raw)).toHaveLength(INTERNETMARKE_PRESET_MAX);
  });
});

describe("mergeLegacyInternetmarkeProduct", () => {
  it("übernimmt das bisherige Einzelprodukt wenn Presets leer sind", () => {
    expect(
      mergeLegacyInternetmarkeProduct([], {
        productCode: 1,
        productPriceCents: 95,
        productNameSnapshot: "Standardbrief",
      }),
    ).toEqual([
      {
        productCode: 1,
        name: "Standardbrief",
        priceCents: 95,
        transport: "unknown",
        maxWeightG: null,
      },
    ]);
  });

  it("lässt vorhandene Presets unangetastet", () => {
    expect(
      mergeLegacyInternetmarkeProduct([brief], {
        productCode: 99,
        productPriceCents: 1,
        productNameSnapshot: "alt",
      }),
    ).toEqual([brief]);
  });
});

describe("add/remove InternetmarkeProductPreset", () => {
  it("fügt hinzu und lehnt das 6. Produkt ab", () => {
    let presets: InternetmarkeProductPreset[] = [brief];
    const added = addInternetmarkeProductPreset(presets, ware);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    presets = added.presets;
    for (let i = 0; i < 3; i += 1) {
      const next = addInternetmarkeProductPreset(presets, {
        productCode: 10 + i,
        name: `P${i}`,
        priceCents: 100,
        transport: "unknown",
        maxWeightG: null,
      });
      expect(next.ok).toBe(true);
      if (next.ok) presets = next.presets;
    }
    expect(presets).toHaveLength(5);
    const sixth = addInternetmarkeProductPreset(presets, {
      productCode: 99,
      name: "zu viel",
      priceCents: 100,
      transport: "unknown",
      maxWeightG: null,
    });
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) expect(sixth.error).toMatch(/Maximal 5/);
  });

  it("lehnt Duplikate ab", () => {
    const result = addInternetmarkeProductPreset([brief], brief);
    expect(result.ok).toBe(false);
  });

  it("entfernt und aktualisiert den Preis", () => {
    const remaining = removeInternetmarkeProductPreset([brief, ware], 1);
    expect(remaining).toEqual([ware]);
    expect(findInternetmarkeProductPreset(remaining, 290)?.name).toBe("Warensendung");
    expect(withUpdatedInternetmarkePresetPrice(remaining, 290, 299)[0]?.priceCents).toBe(299);
  });
});
