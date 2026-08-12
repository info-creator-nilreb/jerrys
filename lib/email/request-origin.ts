import { headers } from "next/headers";

/**
 * Öffentliche Origin der aktuellen Admin-Anfrage (Preview-Deployments inkl.).
 * Für E-Mail-Vorschau/Icons: Assets vom gleichen Host laden wie die Admin-UI.
 */
export async function resolveRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim();
  if (!host) return "";
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  return `${proto}://${host}`.replace(/\/$/, "");
}
