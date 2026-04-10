<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Marken-Akzent (jerry's)

- **Primärfarbe:** Akzentgrün aus `app/globals.css` (`--primary` / `--primary-hover`, Tailwind: `text-primary`, `bg-primary`, `hover:bg-(--primary-hover)`).
- **Regel:** Storefront, **Admin-Login**, **Admin-Dashboard** (`AdminShell`) und alle primären Aktionen (Haupt-Buttons, zentrale Links, Nav-Aktivzustand, Avatar-Akzente, Pflichtfeld-Sterne, Fokus) nutzen dieses Grün — nicht Referenz-Blau aus Drittanbieter-UI (z. B. Shopware-Screenshots).
- **Layout-Hinweis:** Die **Sidebar** darf dunkles Navy (`#182d4d`) als Hintergrund behalten (Lesbarkeit, Shopware-ähnliche Struktur); **interaktive Akzente** darauf sind trotzdem **Primärgrün** (nicht Blau).
