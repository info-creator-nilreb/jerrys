import { customerAuthEmailActionUrl } from "@/lib/email/customer-auth-email-link";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";
import {
  authAfterButtonNoteHtml,
  customerGreetingHtml,
} from "@/lib/email/templates/auth-email-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { createLogger } from "@/lib/logging/logger";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";
import type { EmailTemplateKey } from "@/lib/email/templates/catalog";

const log = createLogger("email.customer-auth");

export type CustomerAuthEmailKind = "email_verify" | "magic_link" | "password_reset";

const AUTH_META: Record<
  CustomerAuthEmailKind,
  { cta: string; pathPrefix: string; templateKey: EmailTemplateKey }
> = {
  email_verify: {
    cta: "E-Mail bestätigen",
    pathPrefix: "/konto/verifizieren",
    templateKey: "email_verify",
  },
  magic_link: {
    cta: "Jetzt anmelden",
    pathPrefix: "/konto/magic-link",
    templateKey: "magic_link",
  },
  password_reset: {
    cta: "Passwort zurücksetzen",
    pathPrefix: "/konto/passwort-zuruecksetzen",
    templateKey: "password_reset",
  },
};

export type CustomerAuthEmailSendResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_site_url" | "provider_unconfigured" | "provider_error" | "disabled";
    };

export async function sendCustomerAuthEmail(params: {
  kind: CustomerAuthEmailKind;
  to: string;
  rawToken: string;
  firstName?: string | null;
}): Promise<CustomerAuthEmailSendResult> {
  const branding = await resolveTransactionalEmailBranding();
  const meta = AUTH_META[params.kind];
  const href = customerAuthEmailActionUrl(meta.pathPrefix, params.rawToken, {
    tokenInHash: params.kind === "email_verify",
  });
  if (!href) {
    log.warn("customer_auth_email_missing_site_url", { kind: params.kind });
    return { ok: false, reason: "missing_site_url" };
  }

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, {
      cta: { href, label: meta.cta },
      heroVariant: "account",
    }),
    {
      customer: {
        first_name: params.firstName?.trim() ?? "",
        greeting_html: customerGreetingHtml(params.firstName),
      },
      email: {
        after_button_note_html:
          params.kind === "password_reset" ? authAfterButtonNoteHtml() : "",
      },
    },
  );

  const rendered = await renderStoredEmailTemplate(meta.templateKey, vars);
  if (!rendered.enabled) {
    log.warn("customer_auth_email_disabled", { kind: params.kind });
    return { ok: false, reason: "disabled" };
  }

  const result = await sendTransactionalEmail({
    to: params.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
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
