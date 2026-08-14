import { describe, expect, it } from "vitest";
import {
  ADMIN_LIST_DEFAULT_PAGE_SIZE,
  adminListPageCount,
  adminListRangeLabel,
  buildAdminListHref,
  clampAdminListPage,
  parseAdminListPagination,
} from "@/lib/admin/list-pagination";

describe("parseAdminListPagination", () => {
  it("nutzt Standard 25 pro Seite", () => {
    const p = parseAdminListPagination({});
    expect(p.pageSize).toBe(ADMIN_LIST_DEFAULT_PAGE_SIZE);
    expect(p.page).toBe(1);
    expect(p.skip).toBe(0);
    expect(p.take).toBe(25);
  });

  it("parst page und size", () => {
    const p = parseAdminListPagination({ page: "3", size: "50" });
    expect(p.page).toBe(3);
    expect(p.pageSize).toBe(50);
    expect(p.skip).toBe(100);
  });

  it("ignoriert ungültige Werte", () => {
    const p = parseAdminListPagination({ page: "-1", size: "999" });
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
  });
});

describe("buildAdminListHref", () => {
  it("lässt Default-Parameter weg", () => {
    expect(buildAdminListHref("/admin/orders", {}, { page: 1, pageSize: 25 })).toBe(
      "/admin/orders",
    );
  });

  it("baut page und size", () => {
    expect(
      buildAdminListHref("/admin/orders", { page: 2, size: 50 }, { page: 1, pageSize: 25 }),
    ).toBe("/admin/orders?page=2&size=50");
  });
});

describe("clampAdminListPage", () => {
  it("begrenzt Seite auf letzte verfügbare", () => {
    const clamped = clampAdminListPage(
      parseAdminListPagination({ page: "99", size: "25" }),
      30,
    );
    expect(clamped.page).toBe(2);
    expect(clamped.skip).toBe(25);
  });
});

describe("adminListRangeLabel", () => {
  it("formatiert Bereich", () => {
    expect(adminListRangeLabel(2, 25, 60)).toBe("26–50 von 60");
  });
});

describe("adminListPageCount", () => {
  it("berechnet Seitenzahl", () => {
    expect(adminListPageCount(60, 25)).toBe(3);
    expect(adminListPageCount(0, 25)).toBe(1);
  });
});
