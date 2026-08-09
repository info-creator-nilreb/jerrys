<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Marken-Akzent (jerry's)

- **Primärfarbe:** Akzentgrün aus `app/globals.css` (`--primary` / `--primary-hover`, Tailwind: `text-primary`, `bg-primary`, `hover:bg-(--primary-hover)`).
- **Regel:** Storefront, **Admin-Login**, **Admin-Dashboard** (`AdminShell`) und alle primären Aktionen (Haupt-Buttons, zentrale Links, Nav-Aktivzustand, Avatar-Akzente, Pflichtfeld-Sterne, Fokus) nutzen dieses Grün — nicht Referenz-Blau aus Drittanbieter-UI (z. B. Shopware-Screenshots).
- **Layout-Hinweis:** Die **Sidebar** darf dunkles Navy (`#182d4d`) als Hintergrund behalten (Lesbarkeit, Shopware-ähnliche Struktur); **interaktive Akzente** darauf sind trotzdem **Primärgrün** (nicht Blau).

## Design-Prämissen

- Verbindliche Grundlage für Storefront und administratives Backend: `docs/DESIGN_SYSTEM.md`.
- „Shopify-like“ bedeutet ruhige Hierarchie, bekannte Commerce-Muster, neutrale Flächen, klare Zustände und geringe visuelle Komplexität; keine pixelgenaue Shopify-Kopie.
- Pro Ansicht nur eine visuell dominante Primäraktion. Sekundäre und destruktive Aktionen bleiben klar unterscheidbar.
- Vor neuen Einzelwerten bestehende Design-Tokens aus `app/globals.css` verwenden. Bestehende hart codierte Werte werden beim Anfassen der jeweiligen Ansicht schrittweise migriert, nicht durch einen unkontrollierten Komplettumbau.
- Backend-Oberflächen zeigen den autoritativen Serverzustand. Zahlung, Refund, Bestand, Buchung, Rollen und Versand dürfen nicht nur optimistisch als erfolgreich dargestellt werden.
- Neue UI berücksichtigt leere, ladende, erfolgreiche, fehlgeschlagene, deaktivierte und mobile Zustände sowie WCAG 2.2 AA.

## Icons (Lucide React)

- Alle **UI-Icons** im Anwendungscode nutzen **`lucide-react`** (benannte Komponenten aus `lucide-react`). Keine handgeschriebenen Inline-`<svg>` für Standard-Icons in TSX/JSX.
- **Ausnahmen:** statische Grafiken unter `public/`; **Logos** und illustrative Bilder über `next/image` oder Rich-Text; **Nationalflaggen** als reine Farbflächen (z. B. DE-Tricolor), wenn die korrekte Darstellung Vorrang vor einem generischen Linien-Icon hat.
- Neue Icons: auf [lucide.dev/icons](https://lucide.dev/icons) wählen; `className` / `size` / `strokeWidth` an bestehende Verwendung anlehnen; bei Icon-in-Buttons den **Button** mit `aria-label` versehen, das Icon `aria-hidden`, sofern redundant.
