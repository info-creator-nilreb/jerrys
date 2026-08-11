import { listPublishedWorkshopSessionsForStorefront } from "@/features/workshops";
import { WorkshopSessionEmbedPanel } from "@/components/storefront/workshop-session-embed-panel";
import { WorkshopSessionStorefrontCard } from "@/components/storefront/workshop-session-storefront-card";

export type WorkshopSessionListDensity = "full" | "embed";

/** Pool für Monats-Chips / „weitere Termine“-Zähler (über dem sichtbaren Limit). */
const EMBED_SESSION_POOL_LIMIT = 48;

type Props = {
  /** Überschrift weglassen bei Einbettung (PDP, CMS ohne Header). */
  showHeader?: boolean;
  /** Optionaler Titel; Default „Kommende Termine“. */
  title?: string;
  /** Optionaler Untertitel unter dem Titel. */
  intro?: string;
  /** Eindeutige Heading-ID (mehrere Blöcke auf einer Seite). */
  headingId?: string;
  /** Sichtbare Zeilen in der Embed-Liste (Default 6). */
  limit?: number;
  emptyMessage?: string;
  /** Zusätzlicher Inhalt unter leerer Liste (z. B. Wunschtermin). */
  emptyStateAddon?: React.ReactNode;
  /**
   * `full` = Karten mit allen Infos (/termine).
   * `embed` = schlanke Zeilen für Landing/PDP (progressive disclosure).
   */
  density?: WorkshopSessionListDensity;
  /** Bei embed: ausgebuchte Termine ausblenden (Default true, conversion-fokussiert). */
  hideSoldOut?: boolean;
};

/**
 * Wiederverwendbare Terminliste (Epic 5 / Epic 12).
 * Gleiche Datenquelle — Darstellung je nach Kontext (full vs. embed).
 */
export async function WorkshopSessionList({
  showHeader = true,
  title = "Kommende Termine",
  intro,
  headingId = "workshop-session-list-heading",
  limit = 50,
  emptyMessage = "Derzeit sind keine Termine buchbar.",
  emptyStateAddon,
  density = "full",
  hideSoldOut = density === "embed",
}: Props) {
  const fetchLimit = density === "embed" ? EMBED_SESSION_POOL_LIMIT : limit;
  const sessions = await listPublishedWorkshopSessionsForStorefront({
    limit: fetchLimit,
  });
  const available =
    hideSoldOut && density === "embed"
      ? sessions.filter((s) => s.availability !== "sold_out")
      : sessions;

  const displayLimit = density === "embed" ? Math.min(limit, 24) : limit;
  const poolPossiblyTruncated =
    density === "embed" && sessions.length >= EMBED_SESSION_POOL_LIMIT;

  const resolvedIntro =
    intro !== undefined
      ? intro
      : density === "full"
        ? "Verfügbarkeit und freie Plätze werden serverseitig berechnet."
        : "";

  return (
    <section aria-labelledby={showHeader ? headingId : undefined}>
      {showHeader ? (
        <header className={density === "embed" ? "mb-3" : "mb-6"}>
          <h2
            id={headingId}
            className={
              density === "embed"
                ? "text-lg font-semibold tracking-tight text-(--foreground-heading)"
                : "text-xl font-semibold tracking-tight text-(--foreground-heading)"
            }
          >
            {title}
          </h2>
          {resolvedIntro ? (
            <p className="mt-1.5 text-sm text-(--foreground-muted)">{resolvedIntro}</p>
          ) : null}
        </header>
      ) : null}

      {density === "embed" ? (
        <WorkshopSessionEmbedPanel
          sessions={available}
          displayLimit={displayLimit}
          poolPossiblyTruncated={poolPossiblyTruncated}
          emptyMessage={emptyMessage}
          emptyStateAddon={emptyStateAddon}
        />
      ) : available.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-center text-sm text-(--foreground-muted)">
          <p>{emptyMessage}</p>
          {emptyStateAddon ? <div className="not-prose">{emptyStateAddon}</div> : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {available.map((s) => (
            <li key={s.id}>
              <WorkshopSessionStorefrontCard session={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
