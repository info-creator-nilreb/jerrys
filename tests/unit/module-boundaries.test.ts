import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const checker = path.resolve(
  process.cwd(),
  "scripts/check-module-boundaries.mjs",
);

describe("feature module boundary checker", () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), "jerrys-architecture-"));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  function write(relativePath: string, content: string) {
    const absolutePath = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }

  function runChecker() {
    return spawnSync(process.execPath, [checker], {
      cwd: fixtureRoot,
      encoding: "utf8",
    });
  }

  it(
    "allows public API imports and imports inside the owning module",
    () => {
      write(
        "app/page.ts",
        'import { reserveStock } from "@/features/inventory";',
      );
      write(
        "features/inventory/application/reserve-stock.ts",
        'import { StockReservation } from "@/features/inventory/domain/stock-reservation";',
      );

      const result = runChecker();

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Architecture boundaries valid");
    },
    15_000,
  );

  it(
    "rejects internal cross-module imports and unknown modules",
    () => {
      write(
        "app/page.ts",
        'import { reserveStock } from "@/features/inventory/application/reserve-stock";',
      );
      write(
        "features/orders/application/place-order.ts",
        'import { reserveStock } from "@/features/inventory/application/reserve-stock";',
      );
      write("features/shared/index.ts", "export const value = 1;");

      const result = runChecker();

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("import of internal API");
      expect(result.stderr).toContain('use "@/features/inventory"');
      expect(result.stderr).toContain('unknown feature module "shared"');
    },
    15_000,
  );
});
