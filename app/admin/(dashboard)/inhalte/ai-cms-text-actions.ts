"use server";

import { redirect } from "next/navigation";
import {
  generateCmsAiTextDraft,
  type AiCmsFacts,
  type AiTextKind,
  type CmsAiTextBlockType,
  type CmsAiTextTargetField,
} from "@/features/integrations";
import { getAdminSession } from "@/lib/auth/admin-session";
import { z } from "zod";

export type GenerateCmsAiTextState =
  | {
      ok?: boolean;
      error?: string;
      kind?: AiTextKind;
      draftText?: string;
      applyValue?: string;
      targetField?: CmsAiTextTargetField;
      model?: string;
    }
  | null;

const blockTypeSchema = z.enum(["hero", "richText"]);

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

/**
 * Erzeugt einen CMS-Textentwurf — speichert und veröffentlicht nichts.
 * Übernahme erfolgt clientseitig in die Blockfelder.
 */
export async function generateCmsAiTextAction(
  _prev: GenerateCmsAiTextState,
  formData: FormData,
): Promise<GenerateCmsAiTextState> {
  await requireAdmin();

  const blockParsed = blockTypeSchema.safeParse(String(formData.get("blockType") ?? ""));
  if (!blockParsed.success) {
    return { error: "Ungültiger Block-Typ." };
  }
  const blockType: CmsAiTextBlockType = blockParsed.data;

  const pageTitle = String(formData.get("pageTitle") ?? "").trim();
  if (!pageTitle) {
    return { error: "Bitte zuerst einen Seitentitel eintragen." };
  }

  const pageType = String(formData.get("pageType") ?? "").trim();
  const existingHeadline = String(formData.get("existingHeadline") ?? "").trim();
  const existingBody = stripHtml(String(formData.get("existingBody") ?? "")).slice(0, 4000);
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim() || null;

  const facts: AiCmsFacts = {
    pageTitle,
    title: pageTitle,
    tone: "sachlich, warm, boutique",
    language: "de",
  };
  if (pageType) facts.pageType = pageType;
  if (existingHeadline) facts.existingHeadline = existingHeadline;
  if (existingBody) facts.existingBody = existingBody;
  if (ctaLabel) facts.ctaLabel = ctaLabel;

  const result = await generateCmsAiTextDraft({
    blockType,
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
