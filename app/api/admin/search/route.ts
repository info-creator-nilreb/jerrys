import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  adminGlobalSearch,
  type AdminSearchScope,
} from "@/lib/admin/global-search";

const SCOPES: AdminSearchScope[] = ["all", "products", "orders", "customers"];

function parseScope(raw: string | null): AdminSearchScope {
  if (raw && SCOPES.includes(raw as AdminSearchScope)) {
    return raw as AdminSearchScope;
  }
  return "all";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const scope = parseScope(req.nextUrl.searchParams.get("scope"));

  try {
    const result = await adminGlobalSearch({ query: q, scope });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Suche fehlgeschlagen" }, { status: 500 });
  }
}
