/**
 * Shopify-Bestellungen aus CSV importieren (Dry-Run standard).
 *
 * Usage:
 *   npm run orders:import-shopify -- --file ./orders.csv
 *   npm run orders:import-shopify -- --file ./orders.csv --apply
 *   npm run orders:import-shopify -- --file ./orders.csv --apply --update --tax 19
 */
import fs from "node:fs";
import path from "node:path";
import "./load-env-files";
import { getPrisma } from "../lib/db/prisma";
import { importShopifyOrdersFromCsv } from "../features/orders/application/import-shopify-orders-csv";

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function printHelp() {
  console.log(`Shopify CSV → Bestell-Import (historische Gastbestellungen)

Pflicht:
  --file <path>          Shopify Orders CSV

Optional:
  --out <path>           Report als JSON speichern
  --apply                In die DB schreiben (sonst Dry-Run)
  --update               Bereits importierte Bestellungen aktualisieren
  --tax 7|19             Default-Steuersatz für Positionen (Default 19)
  --help                 Diese Hilfe

Nach dem Import: Kunden registrieren sich mit derselben E-Mail und ordnen
Bestellungen unter Konto → Bestellungen → „Frühere Bestellungen zuordnen“ zu.
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
  const taxRaw = argValue(argv, "--tax") ?? "19";
  const tax = Number(taxRaw);
  if (tax !== 7 && tax !== 19) {
    console.error("--tax muss 7 oder 19 sein.");
    process.exit(1);
  }

  const csvText = fs.readFileSync(abs, "utf8");
  const report = await importShopifyOrdersFromCsv(csvText, {
    mode: apply ? "apply" : "dry-run",
    updateExisting,
    defaultTaxRatePercent: tax as 7 | 19,
  });

  const summary = {
    mode: report.mode,
    orderCount: report.orderCount,
    validCount: report.validCount,
    invalidCount: report.invalidCount,
    createdCount: report.createdCount,
    updatedCount: report.updatedCount,
    skippedCount: report.skippedCount,
    orders: report.orders,
  };

  const out = argValue(argv, "--out");
  if (out) {
    const outAbs = path.resolve(out);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, JSON.stringify({ summary, mapped: report.mapped }, null, 2), "utf8");
    console.error(`Report geschrieben: ${outAbs}`);
  }

  console.log(JSON.stringify(summary, null, 2));

  await getPrisma().$disconnect();

  if (report.invalidCount > 0) {
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
