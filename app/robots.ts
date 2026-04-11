import type { MetadataRoute } from "next";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

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
        disallow: ["/admin/", "/api/", "/checkout", "/warenkorb"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
