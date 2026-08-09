import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  grayInfoCard,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("email.customer-auth");

export type CustomerAuthEmailKind = "email_verify" | "magic_link" | "password_reset";

const copy: Record<
  CustomerAuthEmailKind,
  { subject: string; heading: string; intro: string; cta: string; pathPrefix: string }
> = {
  email_verify: {
    subject: "Bitte E-Mail bestätigen — jerry's",
    heading: "E-Mail bestätigen",
    intro: "Bitte bestätige deine E-Mail-Adresse, um dein Kundenkonto zu aktivieren.",
    cta: "E-Mail bestätigen",
    pathPrefix: "/konto/verifizieren",
  },
  magic_link: {
    subject: "Dein Anmelde-Link — jerry's",
    heading: "Magic Link",
    intro: "Mit diesem Link meldest du dich sicher bei jerry's an. Der Link ist eine Stunde gültig.",
    cta: "Jetzt anmelden",
    pathPrefix: "/konto/magic-link",
  },
  password_reset: {
    subject: "Passwort zurücksetzen — jerry's",
    heading: "Passwort zurücksetzen",
    intro: "Du hast das Zurücksetzen deines Passworts angefordert. Der Link ist eine Stunde gültig.",
    cta: "Neues Passwort wählen",
    pathPrefix: "/konto/passwort-zuruecksetzen",
  },
};

export type CustomerAuthEmailSendResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_site_url" | "provider_unconfigured" | "provider_error";
    };

export async function sendCustomerAuthEmail(params: {
  kind: CustomerAuthEmailKind;
  to: string;
  rawToken: string;
}): Promise<CustomerAuthEmailSendResult> {
  const meta = copy[params.kind];
  const href = absoluteUrlForEmail(`${meta.pathPrefix}?token=${encodeURIComponent(params.rawToken)}`);
  if (!href) {
    log.warn("customer_auth_email_missing_site_url", { kind: params.kind });
    return { ok: false, reason: "missing_site_url" };
  }

  const bodyHtml = grayInfoCard(
    `<p style="margin:0">Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>`,
  );

  const html = wrapTransactionalEmailHtml({
    variant: "account",
    documentTitle: meta.subject,
    heading: meta.heading,
    intro: meta.intro,
    bodyHtml,
    cta: { href, label: meta.cta },
  });

  const text = [
    meta.heading,
    "",
    meta.intro,
    "",
    `${meta.cta}: ${href}`,
    "",
    "Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.",
  ].join("\n");

  const result = await sendTransactionalEmail({
    to: params.to,
    subject: meta.subject,
    text,
    html,
  });

  if (result.status === "sent") {
    log.info("customer_auth_email_sent", {
      kind: params.kind,
      recipientDomain: params.to.includes("@")
        ? params.to.slice(params.to.lastIndexOf("@") + 1)
        : "unknown",
    });
    return { ok: true };
  }
  if (result.status === "skipped_no_provider") {
    log.warn("customer_auth_email_skipped", { kind: params.kind });
    return { ok: false, reason: "provider_unconfigured" };
  }
  log.error("customer_auth_email_failed", {
    kind: params.kind,
    error: result.errorMessage ?? "unknown",
    httpHint: result.errorMessage?.includes("domain") ? "check_resend_domain" : undefined,
  });
  return { ok: false, reason: "provider_error" };
}

/** Dev/test helper: never log the raw token in production paths. */
export function customerAuthEmailDebugHint(kind: CustomerAuthEmailKind, rawToken: string): string {
  return `${kind}:${escapeHtmlForEmail(rawToken.slice(0, 4))}…`;
}
