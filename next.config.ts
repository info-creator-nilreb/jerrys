import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./lib/site/content-security-policy";

const devPort = process.env.PORT ?? "3001";

const nextConfig: NextConfig = {
  /** Muss zum Dev-Port passen (`npm run dev` → Standard 3001, oder `PORT=3002 npm run dev`). */
  allowedDevOrigins: [
    `http://127.0.0.1:${devPort}`,
    `http://localhost:${devPort}`,
  ],
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
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
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
