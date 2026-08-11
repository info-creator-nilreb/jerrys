import Link from "next/link";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import type { WorkshopCalendarBlockData } from "@/lib/content/blocks/workshop-calendar";

/**
 * CMS-Einbettung: schlanke Terminliste für Landingpages.
 * Details/Buchung nur auf der Terminseite (progressive disclosure).
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
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-12">
      <WorkshopSessionList
        density="embed"
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
