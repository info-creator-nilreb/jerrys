import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");
const API_ROOT = join(ROOT, "app/api");
const SECURITY_SURFACE = join(ROOT, "docs/SECURITY_SURFACE.md");

function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...collectRouteFiles(p));
    } else if (name === "route.ts") {
      out.push(p);
    }
  }
  return out;
}

function filePathToApiPath(routeFile: string): string {
  const rel = relative(API_ROOT, routeFile).replace(/\\/g, "/");
  const withoutRoute = rel.replace(/\/route\.ts$/, "");
  return `/api/${withoutRoute}`;
}

function docCoversRoute(doc: string, apiPath: string): boolean {
  const normalized = apiPath.replace(/\/+/g, "/");
  if (normalized.includes("[...nextauth]")) {
    return doc.includes("[...nextauth]") && doc.includes("api/auth");
  }
  return doc.includes(normalized);
}

describe("SECURITY_SURFACE.md vs app/api/**/route.ts", () => {
  it("listet jede vorhandene API-Route", () => {
    const doc = readFileSync(SECURITY_SURFACE, "utf8");
    const routes = collectRouteFiles(API_ROOT).sort();
    expect(routes.length).toBeGreaterThan(0);

    for (const file of routes) {
      const apiPath = filePathToApiPath(file);
      expect(
        docCoversRoute(doc, apiPath),
        `Fehlender Eintrag für ${apiPath} (${relative(ROOT, file)}) — docs/SECURITY_SURFACE.md ergänzen.`,
      ).toBe(true);
    }
  });
});
