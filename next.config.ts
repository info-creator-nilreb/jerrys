import type { NextConfig } from "next";

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
  },
  async headers() {
    /**
     * `X-Content-Type-Options: nosniff` nicht global auf Dokumente:
     * Safari kann die HTML-Seite sonst als Download ablegen, wenn die
     * Kombination aus Antwort-Headern / MIME nicht exakt passt.
     * Nosniff nur für Pfade, die Next mit festen MIME-Typen ausliefert.
     */
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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
