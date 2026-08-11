import { createLogger } from "@/lib/logging/logger";
import {
  parseResendErrorBody,
  resolveTransactionalMailFrom,
} from "@/lib/email/mail-from";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";

const log = createLogger("email.provider");

function recipientDomain(to: string): string {
  const at = to.lastIndexOf("@");
  return at > 0 ? to.slice(at + 1) : "unknown";
}

export type SendTransactionalResult = {
  status: "sent" | "failed" | "skipped_no_provider";
  providerId?: string;
  errorMessage?: string | null;
};

export type TransactionalAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/**
 * Transaktionale E-Mails ausschließlich über Resend (REST).
 * Benötigt `RESEND_API_KEY` und `MAIL_FROM`. Domain für `MAIL_FROM` in Resend verifizieren.
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: TransactionalAttachment[];
}): Promise<SendTransactionalResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const branding = await resolveTransactionalEmailBranding();
  const { from: fromResolved, source: mailFromSource } = resolveTransactionalMailFrom(
    undefined,
    { displayNameFallback: branding.emailFromName },
  );

  if (!apiKey) {
    log.info("transactional_skipped", {
      reason: "resend_api_key_missing",
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
    });
    return { status: "skipped_no_provider", errorMessage: null };
  }
  if (!fromResolved) {
    log.warn("transactional_skipped", {
      reason: "mail_from_unset_or_invalid",
      mailFromSource,
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
    });
    return { status: "skipped_no_provider", errorMessage: "MAIL_FROM unset or invalid" };
  }

  log.info("transactional_send_attempt", {
    mailFromSource,
    resolvedFrom: fromResolved,
    subject: params.subject,
    recipientDomain: recipientDomain(params.to),
  });

  const payload: Record<string, unknown> = {
    from: fromResolved,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html,
  };
  if (params.attachments?.length) {
    payload.attachments = params.attachments.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
      content_type: a.contentType ?? "application/octet-stream",
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = parseResendErrorBody(json, res.status);
    log.error("transactional_send_failed", {
      httpStatus: res.status,
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
      resolvedFrom: fromResolved,
      mailFromSource,
      fromDomain: fromResolved.includes("@")
        ? fromResolved.slice(fromResolved.lastIndexOf("@") + 1).replace(/>\s*$/, "")
        : "unknown",
      providerMessage: msg.slice(0, 500),
    });
    return { status: "failed", errorMessage: msg.slice(0, 4000) };
  }

  const id =
    json && typeof json === "object" && "id" in json ? String((json as { id: unknown }).id) : undefined;
  log.info("transactional_sent", {
    subject: params.subject,
    recipientDomain: recipientDomain(params.to),
    providerId: id,
  });
  return { status: "sent", providerId: id, errorMessage: null };
}
