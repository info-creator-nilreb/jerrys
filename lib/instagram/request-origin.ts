import type { NextRequest } from "next/server";

/** Origin der eingehenden Anfrage (Vercel/Proxy-aware). */
export function getRequestOrigin(req: NextRequest): string {
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    ?.trim();
  if (!host) {
    try {
      return req.nextUrl.origin;
    } catch {
      return "";
    }
  }
  return `${proto}://${host}`.replace(/\/$/, "");
}
