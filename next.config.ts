import type { NextConfig } from "next";
import { additionalAllowedDevOrigins } from "./lib/site/allowed-dev-origins";
import { buildContentSecurityPolicy } from "./lib/site/content-security-policy";

const devPort = process.env.PORT ?? "3001";

const nextConfig: NextConfig = {
  /** Dev-Route-Indikator (N): Standard unten links liegt hinter der Admin-Sidebar — rechts platzieren. */
  devIndicators: {
    position: "bottom-right",
  },
  /** Cross-Origin in Dev (Cursor-Preview, Codespaces, Tunnel) — sonst 403 auf `/_next/*` und kein Client-JS. */
  allowedDevOrigins: additionalAllowedDevOrigins(devPort),
  /** Standard für Server Actions ist 1 MB — zu klein für Social-Bild-Uploads (mehrere Dateien). */
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.paypalobjects.com",
        pathname: "/webstatic/**",
      },
      /** Vercel Blob public URLs (ADR-0008 / Epic 11 Branding). */
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      /** Instagram CDN Fallback, falls Feed-Bilder nicht nach Blob gespiegelt wurden. */
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      /** Shopify CDN — Produktimport kann vor Blob-Spiegelung Remote-URLs behalten. */
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "*.shopify.com",
      },
    ],
  },
  async headers() {
    /**
     * `X-Content-Type-Options: nosniff` nicht global auf Dokumente:
     * Safari kann die HTML-Seite sonst als Download ablegen, wenn die
     * Kombination aus Antwort-Headern / MIME nicht exakt passt.
     * Nosniff nur für Pfade, die Next mit festen MIME-Typen ausliefert.
     */
    const docSecurityHeaders: { key: string; value: string }[] = [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    /** Cursor/IDE-Previews nutzen oft iframes — in Dev kein DENY (sonst leere Seite / kaputte Client-Navigation). */
    if (process.env.NODE_ENV === "production") {
      docSecurityHeaders.unshift({ key: "X-Frame-Options", value: "DENY" });
    }
    /** Nur auf Vercel (HTTPS), nicht lokal per `next start` ohne TLS. */
    if (process.env.VERCEL === "1") {
      docSecurityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    const csp = buildContentSecurityPolicy();
    if (csp) {
      docSecurityHeaders.push({ key: "Content-Security-Policy", value: csp });
    }

    return [
      {
        source: "/:path*",
        headers: docSecurityHeaders,
      },
      {
        source: "/branding/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
