import { z } from "zod";
import {
  mediaUrlSchema,
  optionalBlockText,
  optionalInternalPathSchema,
} from "@/lib/content/block-data-helpers";

export const HERO_SLIDE_DURATIONS_SEC = [4, 5, 6, 8, 10] as const;
export type HeroSlideDurationSec = (typeof HERO_SLIDE_DURATIONS_SEC)[number];

/** Leichte Bild-Dynamik im Hero-Hintergrund. */
export const HERO_MOTION_EFFECTS = ["none", "fade", "kenBurns", "drift"] as const;
export type HeroMotionEffect = (typeof HERO_MOTION_EFFECTS)[number];

/**
 * Bisheriger Hero-Crop (`object-[40%_center]`). Ein Punkt steuert
 * `object-position` auf allen Viewports — übergroße Bilder bleiben am Motiv.
 */
export const DEFAULT_HERO_FOCUS_X = 40;
export const DEFAULT_HERO_FOCUS_Y = 50;

export function parseHeroFocusPercent(value: unknown, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

const heroFocusXSchema = z.preprocess(
  (v) => parseHeroFocusPercent(v, DEFAULT_HERO_FOCUS_X),
  z.number().min(0).max(100),
);
const heroFocusYSchema = z.preprocess(
  (v) => parseHeroFocusPercent(v, DEFAULT_HERO_FOCUS_Y),
  z.number().min(0).max(100),
);

export const heroSlideSchema = z.object({
  url: mediaUrlSchema,
  alt: optionalBlockText(160),
  focusX: heroFocusXSchema,
  focusY: heroFocusYSchema,
});

export type HeroSlide = z.infer<typeof heroSlideSchema>;

export function heroObjectPosition(
  slide: Pick<HeroSlide, "focusX" | "focusY">,
): string {
  return `${slide.focusX}% ${slide.focusY}%`;
}

export function coerceHeroSlide(raw: unknown): HeroSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!url) return null;
  const altRaw = typeof item.alt === "string" ? item.alt.trim() : "";
  return {
    url,
    alt: altRaw || null,
    focusX: parseHeroFocusPercent(item.focusX, DEFAULT_HERO_FOCUS_X),
    focusY: parseHeroFocusPercent(item.focusY, DEFAULT_HERO_FOCUS_Y),
  };
}

/** Editor/Vorschau: Folien aus unvalidiertem Block-JSON, inkl. Legacy-`imageUrl`. */
export function readHeroSlidesFromUnknown(
  data: Record<string, unknown>,
): HeroSlide[] {
  if (Array.isArray(data.images) && data.images.length > 0) {
    const slides = data.images
      .map(coerceHeroSlide)
      .filter((s): s is HeroSlide => s != null);
    if (slides.length > 0) return slides;
  }
  const legacyUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  if (legacyUrl) {
    const alt = typeof data.imageAlt === "string" ? data.imageAlt.trim() : "";
    return [
      {
        url: legacyUrl,
        alt: alt || null,
        focusX: parseHeroFocusPercent(data.imageFocusX, DEFAULT_HERO_FOCUS_X),
        focusY: parseHeroFocusPercent(data.imageFocusY, DEFAULT_HERO_FOCUS_Y),
      },
    ];
  }
  return [
    {
      url: "/media/hero-mood.jpg",
      alt: null,
      focusX: DEFAULT_HERO_FOCUS_X,
      focusY: DEFAULT_HERO_FOCUS_Y,
    },
  ];
}

export type HeroFocusBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Sichtbarer Bildbereich bei `object-contain` (Letter-/Pillarbox). */
export function heroFocusContentBox(
  container: { width: number; height: number },
  image: { width: number; height: number },
): HeroFocusBox {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return { x: 0, y: 0, width: container.width, height: container.height };
  }
  const containerRatio = container.width / container.height;
  const imageRatio = image.width / image.height;
  if (imageRatio > containerRatio) {
    const height = container.width / imageRatio;
    return {
      x: 0,
      y: (container.height - height) / 2,
      width: container.width,
      height,
    };
  }
  const width = container.height * imageRatio;
  return {
    x: (container.width - width) / 2,
    y: 0,
    width,
    height: container.height,
  };
}

export function heroFocusFromClientPoint(
  clientX: number,
  clientY: number,
  container: { left: number; top: number; width: number; height: number },
  image: { width: number; height: number },
): { focusX: number; focusY: number } {
  const box = heroFocusContentBox(container, image);
  if (box.width <= 0 || box.height <= 0) {
    return { focusX: DEFAULT_HERO_FOCUS_X, focusY: DEFAULT_HERO_FOCUS_Y };
  }
  const x = ((clientX - container.left - box.x) / box.width) * 100;
  const y = ((clientY - container.top - box.y) / box.height) * 100;
  return {
    focusX: parseHeroFocusPercent(x, DEFAULT_HERO_FOCUS_X),
    focusY: parseHeroFocusPercent(y, DEFAULT_HERO_FOCUS_Y),
  };
}

export function heroFocusMarkerOffset(
  focusX: number,
  focusY: number,
  container: { width: number; height: number },
  image: { width: number; height: number },
): { left: number; top: number } {
  const box = heroFocusContentBox(container, image);
  return {
    left: box.x + (box.width * focusX) / 100,
    top: box.y + (box.height * focusY) / 100,
  };
}

function parseSlideDurationSec(value: unknown): HeroSlideDurationSec {
  const n = typeof value === "number" ? value : Number(value);
  if ((HERO_SLIDE_DURATIONS_SEC as readonly number[]).includes(n)) {
    return n as HeroSlideDurationSec;
  }
  return 6;
}

function parseMotionEffect(value: unknown): HeroMotionEffect {
  if (
    typeof value === "string" &&
    (HERO_MOTION_EFFECTS as readonly string[]).includes(value)
  ) {
    return value as HeroMotionEffect;
  }
  return "fade";
}

/**
 * Hero-Block: einzelnes `imageUrl` bleibt Pflicht (Rückwärtskompatibilität).
 * Zusätzliche Folien über `images`; Renderer nutzt `resolveHeroSlides`.
 */
export const heroBlockDataSchema = z.object({
  eyebrow: optionalBlockText(80),
  headline: z.string().trim().min(1).max(120),
  imageUrl: mediaUrlSchema,
  imageAlt: optionalBlockText(160),
  images: z.array(heroSlideSchema).max(8).default([]),
  slideDurationSec: z.preprocess(
    parseSlideDurationSec,
    z.union([
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(8),
      z.literal(10),
    ]),
  ),
  motionEffect: z.preprocess(parseMotionEffect, z.enum(HERO_MOTION_EFFECTS)),
  ctaLabel: optionalBlockText(60),
  ctaHref: optionalInternalPathSchema,
});

export type HeroBlockData = z.infer<typeof heroBlockDataSchema>;

/** Aktive Folien: `images` wenn gesetzt, sonst Legacy-`imageUrl`. */
export function resolveHeroSlides(
  data: Pick<HeroBlockData, "imageUrl" | "imageAlt" | "images">,
): HeroSlide[] {
  if (data.images.length > 0) {
    return data.images;
  }
  return [
    {
      url: data.imageUrl,
      alt: data.imageAlt,
      focusX: DEFAULT_HERO_FOCUS_X,
      focusY: DEFAULT_HERO_FOCUS_Y,
    },
  ];
}

export const HERO_MOTION_EFFECT_LABELS: Record<
  HeroMotionEffect,
  { title: string; hint: string }
> = {
  none: {
    title: "Keine Motion",
    hint: "Statischer Wechsel ohne Zoom/Pan",
  },
  fade: {
    title: "Sanftes Überblenden",
    hint: "Weicher Übergang zwischen den Bildern",
  },
  kenBurns: {
    title: "Leichter Zoom",
    hint: "Minimales Heranzoomen auf dem aktiven Bild",
  },
  drift: {
    title: "Leichte Drift",
    hint: "Sehr dezentes Schwenken im Bild",
  },
};
