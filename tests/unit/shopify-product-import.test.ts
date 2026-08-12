import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, csvRowsToObjects } from "@/features/catalog/domain/parse-csv";
import {
  parseShopifyProductCsv,
  mapShopifyProductToCatalog,
  planShopifyCsvImport,
  generateVariantSku,
} from "@/features/catalog";

const fixturePath = path.join(
  process.cwd(),
  "tests/fixtures/shopify-products-sample.csv",
);
const realExportPath = path.join(
  process.cwd(),
  "tests/fixtures/shopify-products-export-real.csv",
);

describe("parseCsv", () => {
  it("parst quoted Felder mit Kommas", () => {
    const rows = parseCsv('a,b\n"x,y",z\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["x,y", "z"],
    ]);
  });

  it("escaped doppelte Anführungszeichen", () => {
    const rows = parseCsv('a\n"say ""hi"""\n');
    expect(rows[1]).toEqual(['say "hi"']);
  });
});

describe("parseShopifyProductCsv", () => {
  it("gruppiert Varianten und Bilder nach Handle", () => {
    const csv = readFileSync(fixturePath, "utf8");
    const products = parseShopifyProductCsv(csv);
    expect(products).toHaveLength(2);

    const cave = products[0]!;
    expect(cave.handle).toBe("katzenhoehle");
    expect(cave.title).toBe("Katzenhöhle Premium");
    expect(cave.variants).toHaveLength(1);
    expect(cave.variants[0]!.sku).toBe("KH-001");
    expect(cave.images).toHaveLength(2);
    expect(cave.tags).toEqual(["katze", "bestseller"]);

    const tea = products[1]!;
    expect(tea.variants).toHaveLength(2);
    expect(tea.variants.map((v) => v.sku)).toEqual(["TS-S", "TS-L"]);
  });

  it("parst echten Shopify-Export mit leeren SKUs und Metafields", () => {
    const csv = readFileSync(realExportPath, "utf8");
    const products = parseShopifyProductCsv(csv);
    expect(products).toHaveLength(3);
    const armband = products[0]!;
    expect(armband.title).toContain("Armband Candy");
    expect(armband.variants).toHaveLength(2);
    expect(armband.variants.every((v) => v.sku === "")).toBe(true);
    expect(armband.variants[0]!.price).toBe("16.00");
    expect(armband.metafields.material).toMatch(/Resin/i);
    expect(armband.metafields.deliveryNote).toMatch(/Werktagen/i);
    expect(armband.images.length).toBeGreaterThanOrEqual(1);
  });
});

describe("mapShopifyProductToCatalog", () => {
  it("mappt Preise in Cent und Default-Variante", () => {
    const csv = readFileSync(fixturePath, "utf8");
    const [cave] = parseShopifyProductCsv(csv);
    const mapped = mapShopifyProductToCatalog(cave!, { taxRatePercent: 19 });

    expect(mapped.errors).toEqual([]);
    expect(mapped.slug).toBe("katzenhoehle");
    expect(mapped.variants[0]!.priceGrossCents).toBe(4990);
    expect(mapped.variants[0]!.listPriceGrossCents).toBe(5990);
    expect(mapped.variants[0]!.isDefault).toBe(true);
    expect(mapped.variants[0]!.stockQuantity).toBe(12);
    expect(mapped.variants[0]!.availableQuantity).toBe(12);
    expect(mapped.weightText).toBe("850 g");
    expect(mapped.leadText).toBe("Kurzer Teaser für die Höhle");
    expect(mapped.images[0]!.isCover).toBe(true);
  });

  it("baut Variantentitel aus Optionen", () => {
    const csv = readFileSync(fixturePath, "utf8");
    const products = parseShopifyProductCsv(csv);
    const tea = mapShopifyProductToCatalog(products[1]!);
    expect(tea.variants.map((v) => v.title)).toEqual(["Klein", "Groß"]);
    expect(tea.variants[0]!.isDefault).toBe(true);
    expect(tea.variants[1]!.priceGrossCents).toBe(2499);
    expect(tea.variants[1]!.listPriceGrossCents).toBe(2999);
  });

  it("generiert SKU wenn Shopify-SKU fehlt", () => {
    const mapped = mapShopifyProductToCatalog({
      handle: "broken",
      title: "Broken",
      bodyHtml: "",
      vendor: "",
      productType: "",
      googleProductCategory: "",
      tags: [],
      published: true,
      status: "active",
      seoTitle: "",
      seoDescription: "",
      metafields: {
        material: "",
        dimensions: "",
        deliveryNote: "",
        color: "",
        countryOfOrigin: "",
      },
      variants: [
        {
          sku: "",
          optionValues: ["Default Title"],
          price: "10.00",
          compareAtPrice: "",
          inventoryQty: "1",
          grams: "",
          inventoryPolicy: "deny",
          variantImageUrl: null,
        },
      ],
      images: [],
    });
    expect(mapped.errors).toEqual([]);
    expect(mapped.variants[0]!.sku).toBe("broken");
    expect(mapped.variants[0]!.skuGenerated).toBe(true);
    expect(mapped.warnings.some((w) => w.includes("generiert"))).toBe(true);
  });

  it("mappt realen Export mit generierten SKUs und Metafields", () => {
    const csv = readFileSync(realExportPath, "utf8");
    const planned = planShopifyCsvImport(csv, { allowIncompleteAsDraft: true });
    expect(planned.every((p) => p.errors.length === 0)).toBe(true);
    expect(planned[0]!.variants).toHaveLength(2);
    expect(planned[0]!.variants[0]!.sku).toContain("armband-candy");
    expect(planned[0]!.materialText).toMatch(/Resin/i);
    // SKU-Generierung allein hält Produkte aktiv (Shopify Status active)
    expect(planned[0]!.isActive).toBe(true);
    expect(planned[0]!.deliveryTimeKey).toBe("2-4-werktage");
  });

  it("legt fehlenden Preis als Entwurf ab wenn erlaubt", () => {
    const mapped = mapShopifyProductToCatalog(
      {
        handle: "no-price",
        title: "Ohne Preis",
        bodyHtml: "",
        vendor: "",
        productType: "",
        googleProductCategory: "",
        tags: [],
        published: true,
        status: "active",
        seoTitle: "",
        seoDescription: "",
        metafields: {
          material: "",
          dimensions: "",
          deliveryNote: "",
          color: "",
          countryOfOrigin: "",
        },
        variants: [
          {
            sku: "NP-1",
            optionValues: ["Default Title"],
            price: "",
            compareAtPrice: "",
            inventoryQty: "0",
            grams: "",
            inventoryPolicy: "deny",
            variantImageUrl: null,
          },
        ],
        images: [],
      },
      { allowIncompleteAsDraft: true },
    );
    expect(mapped.errors).toEqual([]);
    expect(mapped.importAsDraft).toBe(true);
    expect(mapped.isActive).toBe(false);
    expect(mapped.variants[0]!.priceGrossCents).toBe(0);
  });
});

describe("generateVariantSku", () => {
  it("hängt Suffix bei Kollisionen an", () => {
    const used = new Set<string>(["ring-shell"]);
    expect(generateVariantSku("ring-shell", [], 0, used)).toBe("ring-shell-2");
  });
});

describe("planShopifyCsvImport", () => {
  it("erkennt doppelte SKUs über Produkte", () => {
    const csv = [
      "Handle,Title,Variant SKU,Variant Price,Variant Inventory Qty,Published,Status",
      "a,A,SAME,10.00,1,true,active",
      "b,B,SAME,11.00,1,true,active",
    ].join("\n");
    const planned = planShopifyCsvImport(csv);
    expect(planned).toHaveLength(2);
    expect(planned[0]!.errors.some((e) => e.includes("mehreren Handles"))).toBe(true);
  });

  it("csvRowsToObjects liefert Header-Keys", () => {
    const objs = csvRowsToObjects(parseCsv("Handle,Title\nx,y\n"));
    expect(objs[0]).toEqual({ Handle: "x", Title: "y" });
  });
});
