import { describe, expect, it } from "vitest";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import {
  resolveHeroSlides,
  type HeroBlockData,
} from "@/lib/content/blocks/hero";

describe("resolveHeroSlides", () => {
  it("nutzt images wenn vorhanden", () => {
    const data = {
      imageUrl: "/media/a.jpg",
      imageAlt: "A",
      images: [
        { url: "/media/b.jpg", alt: "B" },
        { url: "/media/c.jpg", alt: null },
      ],
    } as Pick<HeroBlockData, "imageUrl" | "imageAlt" | "images">;
    expect(resolveHeroSlides(data)).toEqual(data.images);
  });

  it("fällt auf imageUrl zurück", () => {
    expect(
      resolveHeroSlides({
        imageUrl: "/media/hero-mood.jpg",
        imageAlt: "Mood",
        images: [],
      }),
    ).toEqual([{ url: "/media/hero-mood.jpg", alt: "Mood" }]);
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

  it("parst Karussell mit Dauer und Motion", () => {
    const r = parseContentBlockData("hero", {
      headline: "Karussell",
      imageUrl: "/media/a.jpg",
      images: [
        { url: "/media/a.jpg", alt: "Eins" },
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
    expect("images" in r.data && Array.isArray(r.data.images) ? r.data.images : []).toHaveLength(
      2,
    );
  });

  it("korrigiert ungültige Dauer/Motion auf Defaults", () => {
    const r = parseContentBlockData("hero", {
      headline: "X",
      imageUrl: "/media/hero-mood.jpg",
      slideDurationSec: 99,
      motionEffect: "spin",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      slideDurationSec: 6,
      motionEffect: "fade",
    });
  });
});
