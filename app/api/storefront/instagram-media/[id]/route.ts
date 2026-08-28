import { NextResponse, type NextRequest } from "next/server";
import { resolveInstagramMediaProxy } from "@/lib/instagram/proxy-media";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  instagramMediaApiRateLimitHeaders,
  touchInstagramMediaApiAttempt,
} from "@/lib/security/instagram-media-api-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = touchInstagramMediaApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return new NextResponse(null, {
      status: 429,
      headers: instagramMediaApiRateLimitHeaders(limited.retryAfterSec),
    });
  }

  const { id } = await params;
  try {
    const result = await resolveInstagramMediaProxy(id);
    if (!result.ok) {
      return new NextResponse(null, {
        status: result.status,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
