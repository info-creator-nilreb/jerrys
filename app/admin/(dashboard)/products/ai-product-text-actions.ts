"use server";

import { redirect } from "next/navigation";
import {
  generateProductAiTextDraft,
  type AiProductFacts,
  type AiTextKind,
} from "@/features/integrations";
import { getAdminSession } from "@/lib/auth/admin-session";
import { z } from "zod";

export type GenerateProductAiTextState =
  | {
      ok?: boolean;
      error?: string;
      kind?: AiTextKind;
      draftText?: string;
      applyValue?: string;
      targetField?: "leadText" | "descriptionHtml" | "featureBullets" | null;
      model?: string;
    }
  | null;

const kindSchema = z.enum([
  "short_description",
  "long_description",
  "seo_title",
  "seo_description",
  "bullets",
  "alt_text",
]);

const factsSchema = z.object({
  title: z.string().trim().max(200).optional(),
  sku: z.string().trim().max(120).optional(),
  shortDescription: z.string().trim().max(2000).optional(),
  longDescription: z.string().trim().max(20_000).optional(),
  materials: z.string().trim().max(500).optional(),
  dimensions: z.string().trim().max(500).optional(),
  categoryNames: z.string().trim().max(500).optional(),
  tone: z.string().trim().max(120).optional(),
  language: z.string().trim().max(40).optional(),
});

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Erzeugt einen Textentwurf — speichert nichts am Produkt.
 * Übernahme erfolgt clientseitig in die Formularfelder.
 */
export async function generateProductAiTextAction(
  _prev: GenerateProductAiTextState,
  formData: FormData,
): Promise<GenerateProductAiTextState> {
  await requireAdmin();

  const kindParsed = kindSchema.safeParse(String(formData.get("kind") ?? ""));
  if (!kindParsed.success) {
    return { error: "Ungültige Textart." };
  }

  const factsParsed = factsSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    longDescription: stripHtml(String(formData.get("longDescription") ?? "")),
    materials: String(formData.get("materials") ?? ""),
    dimensions: String(formData.get("dimensions") ?? ""),
    categoryNames: String(formData.get("categoryNames") ?? ""),
    tone: String(formData.get("tone") ?? "") || "sachlich, warm, boutique",
    language: "de",
  });

  if (!factsParsed.success) {
    return { error: factsParsed.error.issues[0]?.message ?? "Ungültige Fakten." };
  }

  const f = factsParsed.data;
  if (!f.title?.trim()) {
    return { error: "Bitte zuerst einen Produktnamen eintragen." };
  }

  const facts: AiProductFacts = {};
  if (f.title) facts.title = f.title;
  if (f.sku) facts.sku = f.sku;
  if (f.shortDescription) facts.shortDescription = f.shortDescription;
  if (f.longDescription) facts.longDescription = f.longDescription;
  if (f.materials) facts.materials = f.materials;
  if (f.dimensions) facts.dimensions = f.dimensions;
  if (f.categoryNames) {
    facts.categoryNames = f.categoryNames
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (f.tone) facts.tone = f.tone;
  if (f.language) facts.language = f.language;

  const instruction = String(formData.get("instruction") ?? "").trim() || null;

  const result = await generateProductAiTextDraft({
    kind: kindParsed.data,
    facts,
    instruction,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    ok: true,
    kind: result.kind,
    draftText: result.draftText,
    applyValue: result.applyValue,
    targetField: result.targetField,
    model: result.meta.model,
  };
}
