import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { createLogger } from "@/lib/logging/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("customers.magic-link-route");

function redirectTo(req: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.nextUrl.origin));
}

/**
 * Magic-Link-Callback as Route Handler (not RSC page): Auth.js must set
 * session cookies here — cookies().set is not allowed during page render.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return redirectTo(req, "/?konto=magic-ungueltig");
  }

  try {
    const result = await signIn("customer-magic-link", {
      token,
      redirect: false,
      redirectTo: "/konto",
    });

    const resultUrl = typeof result === "string" ? result : "";
    if (
      !resultUrl ||
      resultUrl.includes("error=") ||
      resultUrl.includes("/admin/login")
    ) {
      log.warn("magic_link_signin_rejected");
      return redirectTo(req, "/?konto=magic-fehlgeschlagen");
    }

    return redirectTo(req, "/konto");
  } catch (e) {
    log.error("magic_link_signin_failed", { error: String(e) });
    return redirectTo(req, "/?konto=magic-fehlgeschlagen");
  }
}
