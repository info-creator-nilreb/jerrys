import Link from "next/link";
import { listPublishedWorkshopSessionsForStorefront } from "@/features/workshops";
import { WorkshopSessionEmbedRow } from "@/components/storefront/workshop-session-embed-row";
import { WorkshopSessionStorefrontCard } from "@/components/storefront/workshop-session-storefront-card";

export type WorkshopSessionListDensity = "full" | "embed";

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
  /**
   * `full` = Karten mit allen Infos (/termine).
   * `embed` = schlanke Zeilen für Landing/PDP (progressive disclosure).
   */
  density?: WorkshopSessionListDensity;
  /** Bei embed: ausgebuchte Termine ausblenden (Default true, conversion-fokussiert). */
  hideSoldOut?: boolean;
  /** Footer-Link zur vollständigen Terminübersicht. */
  showAllSessionsLink?: boolean;
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
  showAllSessionsLink = density === "embed",
}: Props) {
  const sessions = await listPublishedWorkshopSessionsForStorefront({ limit });
  const visible =
    hideSoldOut && density === "embed"
      ? sessions.filter((s) => s.availability !== "sold_out")
      : sessions;

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

      {visible.length === 0 ? (
        <div
          className={`rounded-md border border-(--surface-muted) bg-(--surface-soft) text-center text-sm text-(--foreground-muted) ${
            density === "embed" ? "px-3 py-5" : "px-4 py-8"
          }`}
        >
          <p>{emptyMessage}</p>
          {emptyStateAddon ? <div className="not-prose">{emptyStateAddon}</div> : null}
        </div>
      ) : density === "embed" ? (
        <ul className="divide-y divide-(--surface-muted) overflow-hidden rounded-md border border-(--surface-muted) bg-white">
          {visible.map((s) => (
            <li key={s.id}>
              <WorkshopSessionEmbedRow session={s} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-4">
          {visible.map((s) => (
            <li key={s.id}>
              <WorkshopSessionStorefrontCard session={s} />
            </li>
          ))}
        </ul>
      )}

      {showAllSessionsLink && visible.length > 0 ? (
        <p className="mt-3 text-sm">
          <Link
            href="/termine"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Alle Termine ansehen
          </Link>
        </p>
      ) : null}
    </section>
  );
}
