/**
 * Shopify-Produkte aus CSV importieren (Dry-Run standard).
 *
 * Usage:
 *   npm run catalog:import-shopify -- --file ./export.csv
 *   npm run catalog:import-shopify -- --file ./export.csv --draft --mirror-images
 *   npm run catalog:import-shopify -- --file ./export.csv --apply --update --tax 19
 */
import fs from "node:fs";
import path from "node:path";
import "./load-env-files";
import { getPrisma } from "../lib/db/prisma";
import { importShopifyProductsFromCsv } from "../features/catalog/application/import-shopify-csv";
import type { DeliveryTimeKey } from "../lib/catalog/delivery-options";
import { DELIVERY_TIME_OPTIONS } from "../lib/catalog/delivery-options";

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function printHelp() {
  console.log(`Shopify CSV → Katalog-Import

Pflicht:
  --file <path>          Shopify Product CSV

Optional:
  --out <path>           Report als JSON speichern
  --apply                In die DB schreiben (sonst Dry-Run)
  --update               Bestehende Slugs/SKUs aktualisieren
  --draft                Unvollständige als Entwurf (inaktiv); SKUs generieren
  --mirror-images        Bilder von Shopify-CDN spiegeln (Blob/lokal)
  --skip-invalid         Ungültige Zeilen überspringen (Apply; wie Shopify)
  --tax 7|19             Steuersatz (Default 19, Brutto-Annahme)
  --delivery <key>       ${DELIVERY_TIME_OPTIONS.map((o) => o.value).join(" | ")}
  --help                 Diese Hilfe
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printHelp();
    return;
  }

  const file = argValue(argv, "--file");
  if (!file) {
    printHelp();
    console.error("Fehler: --file ist erforderlich.");
    process.exit(1);
  }

  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`Datei nicht gefunden: ${abs}`);
    process.exit(1);
  }

  const apply = hasFlag(argv, "--apply");
  const updateExisting = hasFlag(argv, "--update");
  const allowIncompleteAsDraft = hasFlag(argv, "--draft");
  const mirrorImages = hasFlag(argv, "--mirror-images");
  const skipInvalid = hasFlag(argv, "--skip-invalid");
  const taxRaw = argValue(argv, "--tax") ?? "19";
  const tax = Number(taxRaw);
  if (tax !== 7 && tax !== 19) {
    console.error("--tax muss 7 oder 19 sein.");
    process.exit(1);
  }

  const deliveryRaw = argValue(argv, "--delivery") ?? "2-4-werktage";
  const deliveryOk = DELIVERY_TIME_OPTIONS.some((o) => o.value === deliveryRaw);
  if (!deliveryOk) {
    console.error(`--delivery ungültig. Erlaubt: ${DELIVERY_TIME_OPTIONS.map((o) => o.value).join(", ")}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(abs, "utf8");
  const report = await importShopifyProductsFromCsv(csvText, {
    mode: apply ? "apply" : "dry-run",
    updateExisting,
    taxRatePercent: tax as 7 | 19,
    deliveryTimeKey: deliveryRaw as DeliveryTimeKey,
    allowIncompleteAsDraft,
    mirrorImages,
    skipInvalid,
  });

  const summary = {
    mode: report.mode,
    productCount: report.productCount,
    validCount: report.validCount,
    invalidCount: report.invalidCount,
    createdCount: report.createdCount,
    updatedCount: report.updatedCount,
    skippedCount: report.skippedCount,
    products: report.products,
  };

  const out = argValue(argv, "--out");
  if (out) {
    const outAbs = path.resolve(out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(
      outAbs,
      JSON.stringify({ summary, mapped: report.mapped }, null, 2),
      "utf8",
    );
    console.error(`Report geschrieben: ${outAbs}`);
  }

  console.log(JSON.stringify(summary, null, 2));

  await getPrisma().$disconnect();

  if (report.invalidCount > 0 && !skipInvalid) {
    process.exitCode = 2;
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    await getPrisma().$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
