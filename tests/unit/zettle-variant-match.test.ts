import { describe, expect, it } from "vitest";
import {
  formatZettleAutoMapMessage,
  matchZettleVariants,
  normalizeZettleIdentifier,
  zettleCatalogToMatchInputs,
  zettleCompositeNameKey,
  zettleNameMatchKey,
  type ShopVariantMatchInput,
  type ZettleVariantMatchInput,
} from "@/features/inventory";

function shop(
  overrides: Partial<ShopVariantMatchInput> & Pick<ShopVariantMatchInput, "productVariantId">,
): ShopVariantMatchInput {
  return {
    productTitle: "Armband",
    variantTitle: null,
    sku: `SKU-${overrides.productVariantId}`,
    mappedZettleVariantUuid: null,
    ...overrides,
  };
}

function zettle(
  overrides: Partial<ZettleVariantMatchInput> & Pick<ZettleVariantMatchInput, "variantUuid">,
): ZettleVariantMatchInput {
  return {
    productUuid: `p-${overrides.variantUuid}`,
    productName: "Armband",
    variantName: null,
    sku: null,
    barcode: null,
    ...overrides,
  };
}

describe("zettle identifier / name keys", () => {
  it("normalisiert SKU/Barcode ohne Whitespace-Kollaps in der Mitte", () => {
    expect(normalizeZettleIdentifier("  AbC-1  ")).toBe("abc-1");
  });

  it("behandelt Default Title als leeren Variantennamen", () => {
    expect(zettleNameMatchKey("Ohrringe Luise", "Default Title")).toBe(
      zettleNameMatchKey("Ohrringe Luise", null),
    );
    expect(zettleCompositeNameKey("Armband", "Gold")).toBe("armband gold");
  });
});

describe("zettleCatalogToMatchInputs", () => {
  it("flacht Katalogprodukte zu Varianten", () => {
    const rows = zettleCatalogToMatchInputs([
      {
        uuid: "prod-1",
        name: "Ring",
        variants: [
          { uuid: "v1", name: "Gold", sku: "R-G", barcode: "4001" },
          { uuid: "v2", name: "Silber", sku: null, barcode: null },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      productUuid: "prod-1",
      variantUuid: "v1",
      sku: "R-G",
      barcode: "4001",
    });
  });
});

describe("matchZettleVariants", () => {
  it("ordnet eindeutige SKU unabhängig von Groß/Kleinschreibung zu", () => {
    const result = matchZettleVariants({
      shopVariants: [shop({ productVariantId: "s1", sku: "LU-01" })],
      zettleVariants: [zettle({ variantUuid: "z1", sku: "lu-01", productName: "Anders" })],
    });
    expect(result.unique).toEqual([
      expect.objectContaining({
        productVariantId: "s1",
        zettleVariantUuid: "z1",
        method: "sku",
      }),
    ]);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  it("matcht Shop-SKU auf eindeutigen Zettle-Barcode wenn SKU fehlt", () => {
    const result = matchZettleVariants({
      shopVariants: [shop({ productVariantId: "s1", sku: "400123" })],
      zettleVariants: [zettle({ variantUuid: "z1", sku: null, barcode: "400123" })],
    });
    expect(result.unique[0]).toMatchObject({ method: "barcode", zettleVariantUuid: "z1" });
  });

  it("SKU hat Vorrang vor abweichendem Namen", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({ productVariantId: "s1", sku: "A", productTitle: "Shopname", variantTitle: null }),
      ],
      zettleVariants: [
        zettle({ variantUuid: "zx", sku: "A", productName: "Zettle-Name" }),
        zettle({ variantUuid: "zy", sku: "B", productName: "Shopname" }),
      ],
    });
    expect(result.unique).toEqual([
      expect.objectContaining({ productVariantId: "s1", zettleVariantUuid: "zx", method: "sku" }),
    ]);
  });

  it("matcht eindeutigen Produkt- und Variantennamen ohne SKU", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "shop-only",
          productTitle: "Ring",
          variantTitle: "Gold",
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "z1",
          sku: null,
          productName: "Ring",
          variantName: "Gold",
        }),
      ],
    });
    expect(result.unique[0]).toMatchObject({ method: "name", zettleVariantUuid: "z1" });
  });

  it("matcht Shop-Variante gegen Zettle-Produkt ohne Variantenname (zusammengesetzter Titel)", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "shop-only",
          productTitle: "Ohrringe Luise",
          variantTitle: "Gold",
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "z1",
          sku: null,
          productName: "Ohrringe Luise Gold",
          variantName: null,
        }),
      ],
    });
    expect(result.unique[0]).toMatchObject({ method: "name", zettleVariantUuid: "z1" });
  });

  it("matcht einvariantes Zettle-Produkt über Produkttitel trotz Variantennamen", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "shop-only",
          productTitle: "Kerze",
          variantTitle: null,
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "z1",
          sku: null,
          productName: "Kerze",
          variantName: "Standard",
        }),
      ],
    });
    expect(result.unique[0]).toMatchObject({ method: "name", zettleVariantUuid: "z1" });
  });

  it("ordnet bei doppelter Zettle-SKU über eindeutigen Namen zu", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "DUP",
          productTitle: "Ring",
          variantTitle: "Gold",
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "zg",
          sku: "DUP",
          productName: "Ring",
          variantName: "Gold",
        }),
        zettle({
          variantUuid: "zs",
          sku: "DUP",
          productName: "Ring",
          variantName: "Silber",
        }),
      ],
    });
    expect(result.unique).toEqual([
      expect.objectContaining({ zettleVariantUuid: "zg", method: "name" }),
    ]);
    expect(result.ambiguous).toHaveLength(0);
  });

  it("bleibt manuell wenn SKU und Name mehrdeutig sind", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "DUP",
          productTitle: "Ring",
          variantTitle: "Gold",
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "z1",
          sku: "DUP",
          productName: "Ring",
          variantName: "Gold",
        }),
        zettle({
          variantUuid: "z2",
          sku: "DUP",
          productName: "Ring",
          variantName: "Gold",
        }),
      ],
    });
    expect(result.unique).toHaveLength(0);
    expect(result.ambiguous).toEqual([
      expect.objectContaining({
        productVariantId: "s1",
        candidates: expect.arrayContaining([
          expect.objectContaining({ variantUuid: "z1" }),
          expect.objectContaining({ variantUuid: "z2" }),
        ]),
      }),
    ]);
  });

  it("überspringt bereits gemappte Varianten und blockiert deren Zettle-UUID", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s-mapped",
          sku: "A",
          mappedZettleVariantUuid: "z-taken",
        }),
        shop({ productVariantId: "s-new", sku: "A", productTitle: "Neu" }),
      ],
      zettleVariants: [
        zettle({ variantUuid: "z-taken", sku: "A", productName: "Alt" }),
        zettle({ variantUuid: "z-free", sku: "B", productName: "Neu" }),
      ],
    });
    expect(result.skippedMapped).toBe(1);
    expect(result.unique).toEqual([
      expect.objectContaining({ productVariantId: "s-new", zettleVariantUuid: "z-free", method: "name" }),
    ]);
  });

  it("weist dieselbe Zettle-Variante nicht zwei Shop-Varianten zu", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({ productVariantId: "s1", sku: "X", productTitle: "Alpha" }),
        shop({ productVariantId: "s2", sku: "Y", productTitle: "Alpha" }),
      ],
      zettleVariants: [zettle({ variantUuid: "z1", sku: "X", productName: "Alpha" })],
    });
    expect(result.unique).toEqual([
      expect.objectContaining({ productVariantId: "s1", method: "sku" }),
    ]);
    expect(result.unmatched).toEqual([{ productVariantId: "s2" }]);
  });

  it("lässt Varianten ohne Treffer ungemappt", () => {
    const result = matchZettleVariants({
      shopVariants: [shop({ productVariantId: "s1", sku: "NONE", productTitle: "Unbekannt" })],
      zettleVariants: [zettle({ variantUuid: "z1", sku: "OTHER", productName: "Anders" })],
    });
    expect(result.unique).toHaveLength(0);
    expect(result.ambiguous).toHaveLength(0);
    expect(result.unmatched).toEqual([{ productVariantId: "s1" }]);
  });

  it("matcht nicht über leere SKUs", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({ productVariantId: "s1", sku: "   ", productTitle: "Unbekannt", variantTitle: "A" }),
      ],
      zettleVariants: [
        zettle({ variantUuid: "z1", sku: "", productName: "Anders", variantName: "B" }),
      ],
    });
    expect(result.unique).toHaveLength(0);
  });

  it("bleibt manuell wenn ein Zettle-Produkt mehrere Varianten ohne eindeutigen Namen hat", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "s1",
          sku: "shop-only",
          productTitle: "Kerze",
          variantTitle: null,
        }),
      ],
      zettleVariants: [
        zettle({
          variantUuid: "zr",
          productUuid: "p-kerze",
          sku: null,
          productName: "Kerze",
          variantName: "Rot",
        }),
        zettle({
          variantUuid: "zb",
          productUuid: "p-kerze",
          sku: null,
          productName: "Kerze",
          variantName: "Blau",
        }),
      ],
    });
    expect(result.unique).toHaveLength(0);
    expect(result.ambiguous[0]?.candidates).toHaveLength(2);
  });

  it("matcht mehrere Varianten desselben Produkts eindeutig über den Namen", () => {
    const result = matchZettleVariants({
      shopVariants: [
        shop({
          productVariantId: "sg",
          sku: "shop-g",
          productTitle: "Ring",
          variantTitle: "Gold",
        }),
        shop({
          productVariantId: "ss",
          sku: "shop-s",
          productTitle: "Ring",
          variantTitle: "Silber",
        }),
      ],
      zettleVariants: [
        zettle({ variantUuid: "zg", sku: null, productName: "Ring", variantName: "Gold" }),
        zettle({ variantUuid: "zs", sku: null, productName: "Ring", variantName: "Silber" }),
      ],
    });
    expect(result.unique).toHaveLength(2);
    expect(result.unique.map((u) => `${u.productVariantId}:${u.zettleVariantUuid}`).sort()).toEqual([
      "sg:zg",
      "ss:zs",
    ]);
  });
});

describe("formatZettleAutoMapMessage", () => {
  it("fasst Zuordnung und manuelle Restarbeit zusammen", () => {
    expect(
      formatZettleAutoMapMessage({
        productCount: 12,
        mapped: 8,
        mappedBySku: 5,
        mappedByBarcode: 1,
        mappedByName: 2,
        ambiguous: 3,
        unmatched: 1,
        skippedMapped: 0,
        saveErrorCount: 0,
      }),
    ).toBe(
      "12 Zettle-Produkte geladen. Eindeutig zugeordnet: 8 (5 SKU, 1 Barcode, 2 Name). Manuell prüfen: 3 mehrdeutig, 1 ohne Treffer.",
    );
  });
});
