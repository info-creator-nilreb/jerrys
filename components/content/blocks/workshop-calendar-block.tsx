import Link from "next/link";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import type { WorkshopCalendarBlockData } from "@/lib/content/blocks/workshop-calendar";

/**
 * CMS-Einbettung des Epic-5-Termin-Kalenders.
 * Eine Datenquelle / eine Buchungslogik — kein paralleler Checkout-Pfad.
 */
export async function WorkshopCalendarBlock({
  data,
  blockId,
}: {
  data: WorkshopCalendarBlockData;
  blockId: string;
}) {
  const emptyAddon =
    data.showDateRequestLink !== false ? (
      <p className="mt-3">
        <Link
          href="/termine/wunschtermin"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Wunschtermin anfragen
        </Link>
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
      <WorkshopSessionList
        showHeader={data.showHeader}
        title={data.title ?? undefined}
        intro={data.intro ?? undefined}
        headingId={`workshop-calendar-${blockId}`}
        limit={data.limit}
        emptyMessage={data.emptyMessage ?? undefined}
        emptyStateAddon={emptyAddon}
      />
    </div>
  );
}
