import {
  resolveTransactionalMailFrom,
  type MailFromResolveSource,
} from "@/lib/email/mail-from";

export type EmailIntegrationStatus = {
  apiKeyConfigured: boolean;
  fromConfigured: boolean;
  ready: boolean;
  from: string | null;
  source: MailFromResolveSource;
};

/** Öffentlicher Status für Admin → Integrationen. Kein API-Key. */
export function getEmailIntegrationStatus(): EmailIntegrationStatus {
  const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const { from, source } = resolveTransactionalMailFrom();
  const fromConfigured = Boolean(from);
  return {
    apiKeyConfigured,
    fromConfigured,
    ready: apiKeyConfigured && fromConfigured,
    from,
    source,
  };
}
