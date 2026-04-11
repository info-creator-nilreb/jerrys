export type SendTransactionalResult = {
  status: "sent" | "failed" | "skipped_no_provider";
  providerId?: string;
  errorMessage?: string | null;
};

/**
 * Versand über Resend (REST, kein SDK). Ohne `RESEND_API_KEY` wird nicht gesendet,
 * der Aufrufer protokolliert `skipped_no_provider`.
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendTransactionalResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey) {
    console.info("[email] skipped (RESEND_API_KEY unset)", { to: params.to, subject: params.subject });
    return { status: "skipped_no_provider", errorMessage: null };
  }
  if (!from) {
    console.warn("[email] skipped (MAIL_FROM unset)");
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
    return { status: "failed", errorMessage: msg.slice(0, 4000) };
  }

  const id =
    json && typeof json === "object" && "id" in json ? String((json as { id: unknown }).id) : undefined;
  return { status: "sent", providerId: id, errorMessage: null };
}
