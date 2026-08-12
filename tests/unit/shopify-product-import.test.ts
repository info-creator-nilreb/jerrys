import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, csvRowsToObjects } from "@/features/catalog/domain/parse-csv";
import {
  parseShopifyProductCsv,
  mapShopifyProductToCatalog,
  planShopifyCsvImport,
} from "@/features/catalog";

const fixturePath = path.join(
  process.cwd(),
  "tests/fixtures/shopify-products-sample.csv",
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

  it("meldet fehlende SKU als Fehler", () => {
    const mapped = mapShopifyProductToCatalog({
      handle: "broken",
      title: "Broken",
      bodyHtml: "",
      vendor: "",
      productType: "",
      tags: [],
      published: true,
      status: "active",
      seoTitle: "",
      seoDescription: "",
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
    expect(mapped.errors.some((e) => e.includes("SKU"))).toBe(true);
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
