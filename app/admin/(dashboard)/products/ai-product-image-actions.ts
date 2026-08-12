"use server";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { persistAiGeneratedProductImage } from "@/features/catalog";
import {
  generateProductAiAltTextDraft,
  generateProductAiImageDraft,
  type AiProductFacts,
} from "@/features/integrations";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getPrisma } from "@/lib/db/prisma";
import {
  detectImageFormat,
  mimeForImageFormat,
} from "@/lib/shop/branding-asset-validation";
import { absoluteUrl } from "@/lib/site/canonical-origin";
import { z } from "zod";

export type AiImageActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
      temporaryImageUrl?: string | null;
      temporaryImageBase64?: string | null;
      previewSrc?: string;
      draftAltText?: string;
      model?: string;
    }
  | null;

async function resolveImageUrlForVision(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/media/")) {
    const abs = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""));
    if (!existsSync(abs)) return null;
    try {
      const buf = await readFile(abs);
      const format = detectImageFormat(buf);
      if (!format || format === "svg" || format === "ico") return null;
      return `data:${mimeForImageFormat(format)};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("/")) {
    return absoluteUrl(trimmed);
  }
  return null;
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

const generateSchema = z.object({
  productId: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(2000),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1024"),
  title: z.string().trim().max(200).optional(),
  materials: z.string().trim().max(500).optional(),
  instruction: z.string().trim().max(300).optional(),
});

/**
 * Erzeugt temporäres KI-Bild + Moderation. Speichert nichts dauerhaft.
 */
export async function generateProductAiImageAction(
  _prev: AiImageActionState,
  formData: FormData,
): Promise<AiImageActionState> {
  await requireAdmin();

  const parsed = generateSchema.safeParse({
    productId: formData.get("productId"),
    prompt: formData.get("prompt"),
    size: formData.get("size") || "1024x1024",
    title: String(formData.get("title") ?? "") || undefined,
    materials: String(formData.get("materials") ?? "") || undefined,
    instruction: String(formData.get("instruction") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, title: true, materialText: true },
  });
  if (!product) {
    return { error: "Produkt nicht gefunden." };
  }

  const facts: AiProductFacts = {
    title: parsed.data.title || product.title,
    language: "de",
    tone: "sachlich, warm, boutique",
  };
  if (parsed.data.materials || product.materialText) {
    facts.materials = parsed.data.materials || product.materialText || undefined;
  }
  if (parsed.data.instruction) {
    facts.imageContext = parsed.data.instruction;
  }

  const result = await generateProductAiImageDraft({
    prompt: parsed.data.prompt,
    facts,
    size: parsed.data.size,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  let draftAltText = `${(parsed.data.title || product.title).slice(0, 80)} – Produktbild`;
  const alt = await generateProductAiAltTextDraft({
    imageUrl: result.previewSrc,
    facts: { title: facts.title, language: "de" },
  });
  if (alt.ok) {
    draftAltText = alt.draftAltText.slice(0, 200);
  }

  return {
    ok: true,
    temporaryImageUrl: result.temporaryImageUrl,
    temporaryImageBase64: result.temporaryImageBase64,
    previewSrc: result.previewSrc,
    draftAltText,
    model: result.meta.model,
    message: "Entwurf bereit — bitte prüfen und erst dann übernehmen.",
  };
}

const confirmSchema = z.object({
  productId: z.string().trim().min(1),
  alt: z.string().trim().min(1).max(200),
  temporaryImageUrl: z.string().trim().max(4000).optional(),
  temporaryImageBase64: z.string().trim().max(12_000_000).optional(),
});

/**
 * Übernimmt den Entwurf dauerhaft in Blob + ProductImage (nach erneuter Moderation).
 */
export async function confirmProductAiImageAction(
  _prev: AiImageActionState,
  formData: FormData,
): Promise<AiImageActionState> {
  await requireAdmin();

  const parsed = confirmSchema.safeParse({
    productId: formData.get("productId"),
    alt: formData.get("alt"),
    temporaryImageUrl: String(formData.get("temporaryImageUrl") ?? "") || undefined,
    temporaryImageBase64: String(formData.get("temporaryImageBase64") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." };
  }

  if (!parsed.data.temporaryImageUrl && !parsed.data.temporaryImageBase64) {
    return { error: "Kein Bildentwurf vorhanden — bitte zuerst erzeugen." };
  }

  const result = await persistAiGeneratedProductImage({
    productId: parsed.data.productId,
    temporaryImageUrl: parsed.data.temporaryImageUrl,
    temporaryImageBase64: parsed.data.temporaryImageBase64,
    alt: parsed.data.alt,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  const product = await getPrisma().product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  });

  revalidatePath("/");
  revalidatePath("/produkte");
  if (product?.slug) revalidatePath(`/produkte/${product.slug}`);
  revalidatePath(`/admin/products/${parsed.data.productId}/edit`);

  return {
    ok: true,
    message: "Bild übernommen und in der Galerie gespeichert.",
  };
}

const altSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .refine(
      (v) => v.startsWith("https://") || v.startsWith("http://") || v.startsWith("/"),
      "Ungültige Bild-URL.",
    ),
  title: z.string().trim().max(200).optional(),
});

/** Alt-Text-Entwurf für ein bestehendes Galeriebild (nur Vorschau/Copy in UI). */
export async function generateProductAiAltFromUrlAction(
  _prev: AiImageActionState,
  formData: FormData,
): Promise<AiImageActionState> {
  await requireAdmin();

  const parsed = altSchema.safeParse({
    imageUrl: formData.get("imageUrl"),
    title: String(formData.get("title") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Bild-URL." };
  }

  const visionUrl = await resolveImageUrlForVision(parsed.data.imageUrl);
  if (!visionUrl) {
    return {
      error:
        "Bild für Vision nicht erreichbar (lokale Datei fehlt oder URL ungültig).",
    };
  }

  const result = await generateProductAiAltTextDraft({
    imageUrl: visionUrl,
    facts: parsed.data.title
      ? { title: parsed.data.title, language: "de" }
      : { language: "de" },
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    ok: true,
    draftAltText: result.draftAltText,
    message: "Alt-Text-Entwurf erzeugt (noch nicht gespeichert).",
  };
}
