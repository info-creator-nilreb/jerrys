/**
 * Zusätzliche Hosts für `allowedDevOrigins` in `next.config.ts` (nur `next dev`).
 * Ohne passenden Eintrag blockiert Next.js Cross-Origin-Zugriffe auf `/_next/*` → kein Client-Bundle, kein Dev-„N“.
 */
export function additionalAllowedDevOrigins(port = process.env.PORT ?? "3001"): string[] {
  return [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    "127.0.0.1",
    "localhost",
    "*.localhost",
    "*.trycloudflare.com",
    "*.cursor.com",
    "*.cursor.sh",
    "*.github.dev",
    "*.githubpreview.dev",
    "*.preview.app.github.dev",
    "*.codespaces.dev",
    "*.app.github.dev",
  ];
}
