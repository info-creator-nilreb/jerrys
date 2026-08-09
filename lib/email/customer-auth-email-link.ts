import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";

/**
 * Bestätigungs-Links für E-Mails.
 * E-Mail-Verifizierung nutzt URL-Fragment (#token=…), damit Prefetch/Scanner den Token
 * nicht an den Server senden (Query-Parameter gehen oft verloren oder werden vorab aufgerufen).
 */
export function customerAuthEmailActionUrl(
  pathPrefix: string,
  rawToken: string,
  options: { tokenInHash: boolean },
): string | null {
  const base = absoluteUrlForEmail(pathPrefix);
  if (!base) return null;
  const encoded = encodeURIComponent(rawToken);
  if (options.tokenInHash) {
    return `${base}#token=${encoded}`;
  }
  return `${base}?token=${encoded}`;
}
