/** HttpOnly-Cookie: letzter Browse-Kontext für PDP-Breadcrumbs. */
export const BROWSE_CONTEXT_COOKIE = "jerrys_browse_ctx";

export type BrowseContext =
  | { kind: "collection"; slug: string; title?: string }
  | {
      kind: "category";
      slug: string;
      title?: string;
      parent?: { slug: string; title: string } | null;
    }
  | { kind: "catalog" };

const CATALOG_CONTEXT: BrowseContext = { kind: "catalog" };

export function serializeBrowseContext(ctx: BrowseContext): string {
  return JSON.stringify(ctx);
}

export function parseBrowseContext(raw: string | undefined): BrowseContext | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.kind === "catalog") return CATALOG_CONTEXT;
    if (o.kind === "collection" && typeof o.slug === "string") {
      return {
        kind: "collection",
        slug: o.slug,
        title: typeof o.title === "string" ? o.title : undefined,
      };
    }
    if (o.kind === "category" && typeof o.slug === "string") {
      const parent = o.parent;
      if (parent == null) {
        return {
          kind: "category",
          slug: o.slug,
          title: typeof o.title === "string" ? o.title : undefined,
          parent: null,
        };
      }
      if (
        typeof parent === "object" &&
        parent !== null &&
        typeof (parent as { slug?: unknown }).slug === "string" &&
        typeof (parent as { title?: unknown }).title === "string"
      ) {
        return {
          kind: "category",
          slug: o.slug,
          title: typeof o.title === "string" ? o.title : undefined,
          parent: {
            slug: (parent as { slug: string }).slug,
            title: (parent as { title: string }).title,
          },
        };
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export function browseContextCookieOptions(): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  httpOnly: true;
  secure: boolean;
} {
  return {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function browseContextFromPathname(pathname: string): BrowseContext | null {
  if (pathname === "/produkte") return CATALOG_CONTEXT;
  const collection = pathname.match(/^\/kollektionen\/([^/]+)\/?$/);
  if (collection?.[1]) {
    return { kind: "collection", slug: decodeURIComponent(collection[1]) };
  }
  const category = pathname.match(/^\/kategorien\/([^/]+)\/?$/);
  if (category?.[1]) {
    return { kind: "category", slug: decodeURIComponent(category[1]), parent: null };
  }
  return null;
}

export async function persistBrowseContext(ctx: BrowseContext): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(BROWSE_CONTEXT_COOKIE, serializeBrowseContext(ctx), browseContextCookieOptions());
}

export async function readBrowseContextFromCookies(): Promise<BrowseContext | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return parseBrowseContext(cookieStore.get(BROWSE_CONTEXT_COOKIE)?.value);
}

export { CATALOG_CONTEXT };
