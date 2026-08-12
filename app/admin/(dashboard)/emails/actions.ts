"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/admin-session";
import { isEmailTemplateKey } from "@/lib/email/templates/catalog";
import {
  resetEmailTemplateToDefault,
  updateEmailTemplate,
} from "@/lib/email/templates/load";

export type EmailTemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

const saveSchema = z.object({
  key: z.string().min(1),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(300),
  htmlBody: z.string().trim().min(1, "HTML-Inhalt ist erforderlich.").max(500_000),
  textBody: z.string().trim().min(1, "Text-Inhalt ist erforderlich.").max(100_000),
  enabled: z.boolean(),
});

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

export async function saveEmailTemplateAction(
  _prev: EmailTemplateFormState,
  formData: FormData,
): Promise<EmailTemplateFormState> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const keyRaw = String(formData.get("key") ?? "");
  if (!isEmailTemplateKey(keyRaw)) {
    return { error: "Unbekannte Vorlage." };
  }

  const parsed = saveSchema.safeParse({
    key: keyRaw,
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
    textBody: String(formData.get("textBody") ?? ""),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await updateEmailTemplate({
      key: keyRaw,
      subject: parsed.data.subject,
      htmlBody: parsed.data.htmlBody,
      textBody: parsed.data.textBody,
      enabled: parsed.data.enabled,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
    };
  }

  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${keyRaw}/edit`);
  return { ok: true };
}

export async function resetEmailTemplateAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const keyRaw = String(formData.get("key") ?? "");
  if (!isEmailTemplateKey(keyRaw)) {
    redirect("/admin/emails");
  }

  await resetEmailTemplateToDefault(keyRaw);
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${keyRaw}/edit`);
  redirect(`/admin/emails/${keyRaw}/edit`);
}
