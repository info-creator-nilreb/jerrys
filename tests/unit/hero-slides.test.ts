import { describe, expect, it } from "vitest";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import {
  DEFAULT_HERO_FOCUS_X,
  DEFAULT_HERO_FOCUS_Y,
  coerceHeroSlide,
  heroFocusContentBox,
  heroFocusFromClientPoint,
  heroFocusMarkerOffset,
  heroObjectPosition,
  parseHeroFocusPercent,
  readHeroSlidesFromUnknown,
  resolveHeroSlides,
  type HeroBlockData,
} from "@/lib/content/blocks/hero";

describe("resolveHeroSlides", () => {
  it("nutzt images wenn vorhanden", () => {
    const data = {
      imageUrl: "/media/a.jpg",
      imageAlt: "A",
      images: [
        { url: "/media/b.jpg", alt: "B", focusX: 20, focusY: 80 },
        { url: "/media/c.jpg", alt: null, focusX: 40, focusY: 50 },
      ],
    } as Pick<HeroBlockData, "imageUrl" | "imageAlt" | "images">;
    expect(resolveHeroSlides(data)).toEqual(data.images);
  });

  it("fällt auf imageUrl mit Standard-Schwerpunkt zurück", () => {
    expect(
      resolveHeroSlides({
        imageUrl: "/media/hero-mood.jpg",
        imageAlt: "Mood",
        images: [],
      }),
    ).toEqual([
      {
        url: "/media/hero-mood.jpg",
        alt: "Mood",
        focusX: DEFAULT_HERO_FOCUS_X,
        focusY: DEFAULT_HERO_FOCUS_Y,
      },
    ]);
  });
});

describe("hero focus helpers", () => {
  it("klammert Prozentwerte und füllt Lücken", () => {
    expect(parseHeroFocusPercent(undefined, 40)).toBe(40);
    expect(parseHeroFocusPercent("", 50)).toBe(50);
    expect(parseHeroFocusPercent("12.34", 40)).toBe(12.3);
    expect(parseHeroFocusPercent(-10, 40)).toBe(0);
    expect(parseHeroFocusPercent(140, 40)).toBe(100);
    expect(parseHeroFocusPercent("nope", 40)).toBe(40);
  });

  it("baut object-position", () => {
    expect(heroObjectPosition({ focusX: 12.5, focusY: 80 })).toBe("12.5% 80%");
  });

  it("mapped object-contain Letterbox auf Bildkoordinaten", () => {
    const box = heroFocusContentBox({ width: 200, height: 100 }, { width: 400, height: 100 });
    expect(box).toEqual({ x: 0, y: 25, width: 200, height: 50 });

    const point = heroFocusFromClientPoint(
      100,
      50,
      { left: 0, top: 0, width: 200, height: 100 },
      { width: 400, height: 100 },
    );
    expect(point).toEqual({ focusX: 50, focusY: 50 });

    const marker = heroFocusMarkerOffset(50, 0, { width: 200, height: 100 }, { width: 400, height: 100 });
    expect(marker).toEqual({ left: 100, top: 25 });
  });

  it("liest Folien inkl. Fokus aus Editor-JSON", () => {
    expect(
      readHeroSlidesFromUnknown({
        images: [{ url: "/media/a.jpg", alt: "Katze", focusX: 70, focusY: 20 }],
      }),
    ).toEqual([{ url: "/media/a.jpg", alt: "Katze", focusX: 70, focusY: 20 }]);

    expect(
      readHeroSlidesFromUnknown({
        imageUrl: "/media/legacy.jpg",
        imageAlt: "Alt",
      }),
    ).toEqual([
      {
        url: "/media/legacy.jpg",
        alt: "Alt",
        focusX: DEFAULT_HERO_FOCUS_X,
        focusY: DEFAULT_HERO_FOCUS_Y,
      },
    ]);

    expect(coerceHeroSlide({ url: "  ", alt: "x" })).toBeNull();
  });
});

describe("hero block parse", () => {
  it("bleibt rückwärtskompatibel zu Einzelbild", () => {
    const r = parseContentBlockData("hero", {
      headline: "Hallo",
      imageUrl: "/media/hero-mood.jpg",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        headline: "Hallo",
        imageUrl: "/media/hero-mood.jpg",
        images: [],
        slideDurationSec: 6,
        motionEffect: "fade",
      });
    }
  });

  it("parst Karussell mit Dauer, Motion und Schwerpunkt", () => {
    const r = parseContentBlockData("hero", {
      headline: "Karussell",
      imageUrl: "/media/a.jpg",
      images: [
        { url: "/media/a.jpg", alt: "Eins", focusX: 15, focusY: 85 },
        { url: "/media/b.jpg", alt: "Zwei" },
      ],
      slideDurationSec: 8,
      motionEffect: "kenBurns",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      slideDurationSec: 8,
      motionEffect: "kenBurns",
    });
    const images =
      "images" in r.data && Array.isArray(r.data.images) ? r.data.images : [];
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({ focusX: 15, focusY: 85 });
    expect(images[1]).toMatchObject({
      focusX: DEFAULT_HERO_FOCUS_X,
      focusY: DEFAULT_HERO_FOCUS_Y,
    });
  });

  it("korrigiert ungültige Dauer/Motion/Fokus auf Defaults", () => {
    const r = parseContentBlockData("hero", {
      headline: "X",
      imageUrl: "/media/hero-mood.jpg",
      slideDurationSec: 99,
      motionEffect: "spin",
      images: [{ url: "/media/a.jpg", focusX: 240, focusY: "links" }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      slideDurationSec: 6,
      motionEffect: "fade",
    });
    const images =
      "images" in r.data && Array.isArray(r.data.images) ? r.data.images : [];
    expect(images[0]).toMatchObject({
      focusX: 100,
      focusY: DEFAULT_HERO_FOCUS_Y,
    });
  });
});
