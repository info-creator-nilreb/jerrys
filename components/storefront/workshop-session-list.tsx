import { listPublishedWorkshopSessionsForStorefront } from "@/features/workshops";
import { WorkshopSessionStorefrontCard } from "@/components/storefront/workshop-session-storefront-card";

type Props = {
  /** Überschrift weglassen bei Einbettung (PDP, CMS ohne Header). */
  showHeader?: boolean;
  /** Optionaler Titel; Default „Kommende Termine“. */
  title?: string;
  /** Optionaler Untertitel unter dem Titel. */
  intro?: string;
  /** Eindeutige Heading-ID (mehrere Blöcke auf einer Seite). */
  headingId?: string;
  limit?: number;
  emptyMessage?: string;
  /** Zusätzlicher Inhalt unter leerer Liste (z. B. Wunschtermin). */
  emptyStateAddon?: React.ReactNode;
};

/**
 * Wiederverwendbare Terminliste (Epic 5 Slice 2 / Epic 12 Slice 7).
 * Gleiche Datenquelle für `/termine`, PDP und CMS-Blöcke — keine zweite Buchungslogik.
 */
export async function WorkshopSessionList({
  showHeader = true,
  title = "Kommende Termine",
  intro = "Verfügbarkeit und freie Plätze werden serverseitig berechnet.",
  headingId = "workshop-session-list-heading",
  limit = 50,
  emptyMessage = "Derzeit sind keine Termine buchbar.",
  emptyStateAddon,
}: Props) {
  const sessions = await listPublishedWorkshopSessionsForStorefront({ limit });

  return (
    <section aria-labelledby={showHeader ? headingId : undefined}>
      {showHeader ? (
        <header className="mb-6">
          <h2
            id={headingId}
            className="text-xl font-semibold tracking-tight text-(--foreground-heading)"
          >
            {title}
          </h2>
          {intro ? (
            <p className="mt-2 text-sm text-(--foreground-muted)">{intro}</p>
          ) : null}
        </header>
      ) : null}

      {sessions.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-center text-sm text-(--foreground-muted)">
          <p>{emptyMessage}</p>
          {emptyStateAddon ? <div className="not-prose">{emptyStateAddon}</div> : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id}>
              <WorkshopSessionStorefrontCard session={s} compact={!showHeader} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
