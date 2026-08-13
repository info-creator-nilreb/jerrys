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

export const heroSlideSchema = z.object({
  url: mediaUrlSchema,
  alt: optionalBlockText(160),
});

export type HeroSlide = z.infer<typeof heroSlideSchema>;

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
  return [{ url: data.imageUrl, alt: data.imageAlt }];
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
