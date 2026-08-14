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
import { sendTransactionalEmail } from "@/lib/email/provider";
import { renderEmailBodies } from "@/lib/email/templates/render";
import { runWithEmailAssetBaseUrlAsync } from "@/lib/email/email-absolute-url";
import { resolveRequestOrigin } from "@/lib/email/request-origin";
import { buildEmailTemplatePreviewVars } from "@/lib/email/templates/preview-vars";
import { buildPreviewWorkshopIcsAttachment } from "@/lib/email/templates/preview-workshop-ics";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";

export type EmailTemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

export type EmailTemplateTestSendState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
} | null;

const saveSchema = z.object({
  key: z.string().min(1),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(300),
  htmlBody: z.string().trim().min(1, "HTML-Inhalt ist erforderlich.").max(500_000),
  textBody: z.string().trim().min(1, "Text-Inhalt ist erforderlich.").max(100_000),
  enabled: z.boolean(),
});

const testSendSchema = z.object({
  key: z.string().min(1),
  to: z.string().trim().email("Bitte eine gültige E-Mail-Adresse angeben."),
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(300),
  htmlBody: z.string().trim().min(1, "HTML-Inhalt ist erforderlich.").max(500_000),
  textBody: z.string().trim().min(1, "Text-Inhalt ist erforderlich.").max(100_000),
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

/**
 * Testversand mit Beispieldaten — Inhalt aus dem Editor (muss nicht gespeichert sein).
 */
export async function sendEmailTemplateTestAction(
  _prev: EmailTemplateTestSendState,
  formData: FormData,
): Promise<EmailTemplateTestSendState> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const keyRaw = String(formData.get("key") ?? "");
  if (!isEmailTemplateKey(keyRaw)) {
    return { error: "Unbekannte Vorlage." };
  }

  const parsed = testSendSchema.safeParse({
    key: keyRaw,
    to: String(formData.get("to") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    htmlBody: String(formData.get("htmlBody") ?? ""),
    textBody: String(formData.get("textBody") ?? ""),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const requestOrigin = await resolveRequestOrigin();
  const branding = await resolveTransactionalEmailBranding();
  const vars = await runWithEmailAssetBaseUrlAsync(requestOrigin, async () =>
    buildEmailTemplatePreviewVars(keyRaw, branding),
  );
  const rendered = renderEmailBodies(
    {
      subject: parsed.data.subject,
      htmlBody: parsed.data.htmlBody,
      textBody: parsed.data.textBody,
    },
    vars,
  );

  const result = await sendTransactionalEmail({
    to: parsed.data.to,
    subject: `[Test] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    attachments:
      keyRaw === "workshop_booking_confirmation"
        ? [buildPreviewWorkshopIcsAttachment()]
        : undefined,
  });

  if (result.status === "sent") {
    return {
      ok: true,
      message: `Testmail an ${parsed.data.to} gesendet.`,
    };
  }
  if (result.status === "skipped_no_provider") {
    return {
      error:
        "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY / MAIL_FROM).",
    };
  }
  return {
    error: result.errorMessage?.trim() || "Testversand fehlgeschlagen.",
  };
}
