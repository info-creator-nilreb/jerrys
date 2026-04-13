import type { MetadataRoute } from "next";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/** Pfade, die für automatisierte Crawler (KI + klassisch) tabu bleiben. */
const DISALLOW_SENSITIVE = ["/admin/", "/api/", "/checkout", "/warenkorb"] as const;

/** Bekannte KI-/Daten-Crawler: gleiche Grenzen wie für `*`, explizit pro User-Agent für Transparenz. */
const AI_AND_DATA_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "ClaudeBot",
  "PerplexityBot",
  "CCBot",
  "Bytespider",
] as const;

export default function robots(): MetadataRoute.Robots {
  const origin = canonicalSiteOrigin();
  if (!origin) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = origin.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOW_SENSITIVE],
      },
      ...AI_AND_DATA_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...DISALLOW_SENSITIVE],
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
