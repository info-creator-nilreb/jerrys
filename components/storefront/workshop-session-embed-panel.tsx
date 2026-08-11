"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StorefrontWorkshopSessionListItem } from "@/features/workshops";
import { WorkshopSessionEmbedRow } from "@/components/storefront/workshop-session-embed-row";
import {
  buildWorkshopSessionMonthBuckets,
  formatFurtherSessionsLinkLabel,
  workshopSessionMonthKey,
} from "@/lib/workshop/session-month-key";

type Props = {
  sessions: StorefrontWorkshopSessionListItem[];
  displayLimit: number;
  /** true, wenn die Server-Abfrage am Pool-Limit endete (weitere Termine möglich). */
  poolPossiblyTruncated: boolean;
  emptyMessage: string;
  emptyStateAddon?: React.ReactNode;
};

/**
 * Kompakte Embed-Liste mit optionalen Monats-Chips (nur wenn >1 Monat).
 */
export function WorkshopSessionEmbedPanel({
  sessions,
  displayLimit,
  poolPossiblyTruncated,
  emptyMessage,
  emptyStateAddon,
}: Props) {
  const months = useMemo(() => buildWorkshopSessionMonthBuckets(sessions), [sessions]);
  const showMonthChips = months.length > 1;
  const [monthKey, setMonthKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!monthKey) return sessions;
    return sessions.filter(
      (s) => workshopSessionMonthKey(s.startsAt, s.timezone) === monthKey,
    );
  }, [sessions, monthKey]);

  const visible = filtered.slice(0, displayLimit);
  const hiddenInView = Math.max(0, filtered.length - visible.length);

  const linkLabel = (() => {
    if (visible.length === 0) return null;
    // Monatsfilter: nur weitere Termine in diesem Monat (exakte Zahl aus dem Pool).
    if (monthKey) {
      return formatFurtherSessionsLinkLabel({
        remaining: hiddenInView,
        poolPossiblyTruncated: false,
      });
    }
    // „Nächste“: weitere im Pool + Hinweis wenn abgeschnitten.
    if (hiddenInView > 0) {
      return formatFurtherSessionsLinkLabel({
        remaining: hiddenInView,
        poolPossiblyTruncated,
      });
    }
    if (poolPossiblyTruncated) {
      return formatFurtherSessionsLinkLabel({
        remaining: 10,
        poolPossiblyTruncated: true,
      });
    }
    return null;
  })();

  if (sessions.length === 0) {
    return (
      <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-3 py-5 text-center text-sm text-(--foreground-muted)">
        <p>{emptyMessage}</p>
        {emptyStateAddon ? <div className="not-prose">{emptyStateAddon}</div> : null}
      </div>
    );
  }

  return (
    <div>
      {showMonthChips ? (
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Termine nach Monat filtern"
        >
          <MonthChip
            label="Nächste"
            selected={monthKey === null}
            onClick={() => setMonthKey(null)}
          />
          {months.map((m) => (
            <MonthChip
              key={m.key}
              label={m.label}
              selected={monthKey === m.key}
              onClick={() => setMonthKey(m.key)}
            />
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-3 py-5 text-center text-sm text-(--foreground-muted)">
          <p>In diesem Monat sind keine Termine verfügbar.</p>
          <button
            type="button"
            className="mt-2 font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setMonthKey(null)}
          >
            Nächste Termine zeigen
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-(--surface-muted) overflow-hidden rounded-md border border-(--surface-muted) bg-white">
          {visible.map((s) => (
            <li key={s.id}>
              <WorkshopSessionEmbedRow session={s} />
            </li>
          ))}
        </ul>
      )}

      {linkLabel ? (
        <p className="mt-3 text-sm">
          <Link
            href="/termine"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {linkLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function MonthChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        selected
          ? "bg-primary font-medium text-white"
          : "border border-(--surface-muted) bg-white text-(--foreground-heading) hover:border-primary/40 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
