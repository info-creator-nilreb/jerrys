import { z } from "zod";

export function emptyToNull(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? null : t;
}

export const optionalBlockText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable());

/** HTTPS oder öffentlicher Pfad ab `/` (Blob/Static). */
export const mediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (u) => u.startsWith("https://") || u.startsWith("/"),
    "Nur HTTPS-URL oder Pfad ab /.",
  );

export const optionalMediaUrlSchema = z.preprocess(
  emptyToNull,
  mediaUrlSchema.nullable(),
);

export const optionalInternalPathSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(200)
    .refine((p) => p.startsWith("/"), "Pfad mit führendem /.")
    .nullable(),
);

/** Interner Pfad oder HTTPS (z. B. OpenStreetMap / Google Maps). */
export const optionalHttpOrPathSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(800)
    .refine(
      (p) => p.startsWith("/") || p.startsWith("https://"),
      "Pfad mit führendem / oder HTTPS-URL.",
    )
    .nullable(),
);
