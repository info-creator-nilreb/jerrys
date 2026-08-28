import { describe, expect, it } from "vitest";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import {
  resolveSocialReviewsLayout,
  socialFeedDesktopGridClass,
  socialFeedDisplayLimit,
} from "@/lib/content/blocks/social-reviews";

describe("socialReviews raster layout", () => {
  it("Default ist 4×2 = 8 Bilder", () => {
    const r = parseContentBlockData("socialReviews", {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialDesktopColumns: 4,
        socialDesktopRows: 2,
        socialLimit: 8,
      });
    }
  });

  it("leitet Limit aus Spalten × Zeilen ab", () => {
    const r = parseContentBlockData("socialReviews", {
      socialDesktopColumns: 3,
      socialDesktopRows: 1,
      socialLimit: 24,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialDesktopColumns: 3,
        socialDesktopRows: 1,
        socialLimit: 3,
      });
    }
  });

  it("akzeptiert Maximum 6×4 = 24", () => {
    const r = parseContentBlockData("socialReviews", {
      socialDesktopColumns: 6,
      socialDesktopRows: 4,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ socialLimit: 24 });
    }
  });

  it("lehnt Spalten und Zeilen außerhalb der Grenzen ab", () => {
    expect(parseContentBlockData("socialReviews", { socialDesktopColumns: 1 }).ok).toBe(
      false,
    );
    expect(parseContentBlockData("socialReviews", { socialDesktopColumns: 7 }).ok).toBe(
      false,
    );
    expect(parseContentBlockData("socialReviews", { socialDesktopRows: 0 }).ok).toBe(false);
    expect(parseContentBlockData("socialReviews", { socialDesktopRows: 5 }).ok).toBe(false);
  });

  it("mappt Legacy-socialLimit 12 auf 4×3", () => {
    const r = parseContentBlockData("socialReviews", { socialLimit: 12 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialDesktopColumns: 4,
        socialDesktopRows: 3,
        socialLimit: 12,
      });
    }
  });

  it("mappt Legacy-socialLimit 8 auf 4×2", () => {
    const r = parseContentBlockData("socialReviews", { socialLimit: 8 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialDesktopColumns: 4,
        socialDesktopRows: 2,
        socialLimit: 8,
      });
    }
  });

  it("kocht String-Zahlen aus Formularen auf Integers herunter", () => {
    const r = parseContentBlockData("socialReviews", {
      socialDesktopColumns: "5",
      socialDesktopRows: "2",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialDesktopColumns: 5,
        socialDesktopRows: 2,
        socialLimit: 10,
      });
    }
  });
});

describe("socialFeedDisplayLimit / grid class", () => {
  it("deckt Limit auf 24", () => {
    expect(socialFeedDisplayLimit(6, 4)).toBe(24);
    expect(socialFeedDisplayLimit(10, 10)).toBe(24);
  });

  it("liefert Tailwind-Spaltenklassen für Desktop", () => {
    expect(socialFeedDesktopGridClass(2)).toBe("md:grid-cols-2");
    expect(socialFeedDesktopGridClass(4)).toBe("md:grid-cols-4");
    expect(socialFeedDesktopGridClass(6)).toBe("md:grid-cols-6");
    expect(socialFeedDesktopGridClass(99)).toBe("md:grid-cols-6");
  });

  it("resolveSocialReviewsLayout fällt auf Default zurück", () => {
    expect(resolveSocialReviewsLayout(null)).toEqual({
      socialDesktopColumns: 4,
      socialDesktopRows: 2,
      socialLimit: 8,
    });
  });
});
