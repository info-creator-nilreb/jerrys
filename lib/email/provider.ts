import { createLogger } from "@/lib/logging/logger";

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
  const from = process.env.MAIL_FROM?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    log.info("transactional_skipped", {
      reason: "resend_api_key_missing",
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
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
        content_type: a.contentType ?? "application/octet-stream",
      })),
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
