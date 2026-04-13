import nodemailer from "nodemailer";

import { createLogger } from "@/lib/logging/logger";

const log = createLogger("email.provider");

/**
 * Trim + eine umschließende ASCII-`"`-Ebene entfernen (falls `.env`-Parser oder Editor Reste lassen).
 * Keine Änderung an `MAIL_FROM` — dort sind Anführungszeichen im Anzeigenamen absichtlich möglich.
 */
function normalizeSmtpSecret(raw: string): string {
  let v = raw.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function recipientDomain(to: string): string {
  const at = to.lastIndexOf("@");
  return at > 0 ? to.slice(at + 1) : "unknown";
}

export type SendTransactionalResult = {
  status: "sent" | "failed" | "skipped_no_provider";
  providerId?: string;
  errorMessage?: string | null;
};

function smtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER ? normalizeSmtpSecret(process.env.SMTP_USER) : "";
  const pass = process.env.SMTP_PASS ? normalizeSmtpSecret(process.env.SMTP_PASS) : "";
  const from = process.env.MAIL_FROM?.trim();
  return Boolean(host && user && pass && from);
}

/**
 * Transaktionale E-Mails: zuerst SMTP (z. B. Gmail, Port 587 + STARTTLS), sonst Resend (REST).
 * Ohne vollständige SMTP- oder Resend-Konfiguration wird nicht gesendet (`skipped_no_provider`).
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendTransactionalResult> {
  const from = process.env.MAIL_FROM?.trim();

  if (smtpConfigured()) {
    const host = process.env.SMTP_HOST!.trim();
    const port = Number(process.env.SMTP_PORT?.trim() || "587");
    const user = normalizeSmtpSecret(process.env.SMTP_USER!);
    let pass = normalizeSmtpSecret(process.env.SMTP_PASS!);
    if (host.toLowerCase().includes("gmail")) {
      pass = pass.replace(/\s+/g, "");
    }
    const secure = process.env.SMTP_SECURE === "true";

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        requireTLS: !secure,
      });
      const info = await transporter.sendMail({
        from: from!,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return {
        status: "sent",
        providerId: info.messageId || undefined,
        errorMessage: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("transactional_smtp_failed", {
        subject: params.subject,
        recipientDomain: recipientDomain(params.to),
        providerMessage: msg.slice(0, 500),
      });
      return { status: "failed", errorMessage: msg.slice(0, 4000) };
    }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    log.info("transactional_skipped", {
      reason: "no_email_provider",
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
    });
    return { status: "skipped_no_provider", errorMessage: null };
  }
  if (!from) {
    log.warn("transactional_skipped", {
      reason: "mail_from_unset",
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
    });
    return { status: "skipped_no_provider", errorMessage: "MAIL_FROM unset" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : `${res.status} ${res.statusText}`;
    log.error("transactional_send_failed", {
      httpStatus: res.status,
      subject: params.subject,
      recipientDomain: recipientDomain(params.to),
      providerMessage: msg.slice(0, 500),
    });
    return { status: "failed", errorMessage: msg.slice(0, 4000) };
  }

  const id =
    json && typeof json === "object" && "id" in json ? String((json as { id: unknown }).id) : undefined;
  return { status: "sent", providerId: id, errorMessage: null };
}
