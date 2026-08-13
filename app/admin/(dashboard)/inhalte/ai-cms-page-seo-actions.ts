"use server";

import { redirect } from "next/navigation";
import {
  generateCmsPageSeoAiTextDraft,
  isCmsPageSeoAiKind,
  type AiCmsFacts,
  type CmsPageSeoAiKind,
  type CmsPageSeoAiTargetField,
} from "@/features/integrations";
import { getAdminSession } from "@/lib/auth/admin-session";

export type GenerateCmsPageSeoAiTextState =
  | {
      ok?: boolean;
      error?: string;
      kind?: CmsPageSeoAiKind;
      draftText?: string;
      applyValue?: string;
      targetField?: CmsPageSeoAiTargetField;
      model?: string;
    }
  | null;

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
 * SEO-Textentwurf für CMS-Seiten — speichert nichts.
 * Übernahme clientseitig in seoTitle / seoDescription.
 */
export async function generateCmsPageSeoAiTextAction(
  _prev: GenerateCmsPageSeoAiTextState,
  formData: FormData,
): Promise<GenerateCmsPageSeoAiTextState> {
  await requireAdmin();

  const kindRaw = String(formData.get("cmsSeoAiKind") ?? "").trim();
  if (!isCmsPageSeoAiKind(kindRaw)) {
    return { error: "Ungültige SEO-Textart." };
  }
  const kind: CmsPageSeoAiKind = kindRaw;

  const pageTitle = String(formData.get("cmsSeoAiPageTitle") ?? "").trim();
  if (!pageTitle) {
    return { error: "Bitte zuerst einen Seitentitel eintragen." };
  }

  const pageType = String(formData.get("cmsSeoAiPageType") ?? "").trim();
  const existingSeoTitle = String(formData.get("cmsSeoAiExistingTitle") ?? "").trim();
  const existingSeoDescription = String(
    formData.get("cmsSeoAiExistingDescription") ?? "",
  ).trim();
  const pageContext = stripHtml(String(formData.get("cmsSeoAiPageContext") ?? "")).slice(
    0,
    2500,
  );
  const instruction = String(formData.get("cmsSeoAiInstruction") ?? "").trim() || null;

  const facts: AiCmsFacts = {
    pageTitle,
    title: pageTitle,
    tone: "sachlich, warm, boutique",
    language: "de",
  };
  if (pageType) facts.pageType = pageType;
  if (existingSeoTitle) facts.seoTitle = existingSeoTitle;
  if (existingSeoDescription) facts.seoDescription = existingSeoDescription;
  if (pageContext) facts.existingBody = pageContext;

  const result = await generateCmsPageSeoAiTextDraft({
    kind,
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
