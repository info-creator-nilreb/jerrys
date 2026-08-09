import { listPublishedWorkshopSessionsForStorefront } from "@/features/workshops";
import { WorkshopSessionStorefrontCard } from "@/components/storefront/workshop-session-storefront-card";

type Props = {
  /** Überschrift weglassen bei Einbettung (PDP, später CMS-Block). */
  showHeader?: boolean;
  limit?: number;
  emptyMessage?: string;
  /** Zusätzlicher Inhalt unter leerer Liste (z. B. Wunschtermin). */
  emptyStateAddon?: React.ReactNode;
};

/**
 * Wiederverwendbare Terminliste (Epic 5 Slice 2). Gleiche Datenquelle für `/termine`, PDP und künftige CMS-Blöcke.
 */
export async function WorkshopSessionList({
  showHeader = true,
  limit = 50,
  emptyMessage = "Derzeit sind keine Termine buchbar.",
  emptyStateAddon,
}: Props) {
  const sessions = await listPublishedWorkshopSessionsForStorefront({ limit });

  return (
    <section aria-labelledby={showHeader ? "workshop-session-list-heading" : undefined}>
      {showHeader ? (
        <header className="mb-6">
          <h2
            id="workshop-session-list-heading"
            className="text-xl font-semibold tracking-tight text-(--foreground-heading)"
          >
            Kommende Termine
          </h2>
          <p className="mt-2 text-sm text-(--foreground-muted)">
            Verfügbarkeit und freie Plätze werden serverseitig berechnet.
          </p>
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
