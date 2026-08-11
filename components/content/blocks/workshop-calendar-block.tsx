import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import type { WorkshopCalendarBlockData } from "@/lib/content/blocks/workshop-calendar";

export async function WorkshopCalendarBlock({
  data,
}: {
  data: WorkshopCalendarBlockData;
  blockId: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
      <WorkshopSessionList
        showHeader={data.showHeader}
        limit={data.limit}
        emptyMessage={data.emptyMessage ?? undefined}
      />
    </div>
  );
}
