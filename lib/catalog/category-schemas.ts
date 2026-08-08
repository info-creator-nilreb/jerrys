import { z } from "zod";

/** URL-Segment für /kategorien/[slug] — analog Kollektionen. */
export const categorySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug: Kleinbuchstaben, Ziffern und Bindestriche (kein führendes/abschließendes -).",
  });
