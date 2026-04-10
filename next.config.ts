import type { NextConfig } from "next";

const devPort = process.env.PORT ?? "3001";

const nextConfig: NextConfig = {
  /** Muss zum Dev-Port passen (`npm run dev` → Standard 3001, oder `PORT=3002 npm run dev`). */
  allowedDevOrigins: [
    `http://127.0.0.1:${devPort}`,
    `http://localhost:${devPort}`,
  ],
  images: {
    qualities: [75, 90],
  },
};

export default nextConfig;
