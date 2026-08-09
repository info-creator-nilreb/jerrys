import Link from "next/link";
import { MapPin } from "lucide-react";
import type { WorkshopSessionLocationFields } from "@/lib/workshop/workshop-location";
import {
  formatWorkshopSessionLocationBlock,
  workshopSessionMapsSearchUrl,
} from "@/lib/workshop/workshop-location";

export function WorkshopSessionLocationBlock({
  location,
  showMapsLink = true,
}: {
  location: WorkshopSessionLocationFields;
  showMapsLink?: boolean;
}) {
  const { headline, addressLines } = formatWorkshopSessionLocationBlock(location);
  const mapsUrl = showMapsLink ? workshopSessionMapsSearchUrl(location) : null;

  return (
    <div className="flex gap-2">
      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium text-(--foreground-heading)">{headline}</p>
        {addressLines.length > 0 ? (
          <address className="mt-1 not-italic text-(--foreground-muted)">
            {addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : null}
        {mapsUrl ? (
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            Route planen
          </Link>
        ) : null}
      </div>
    </div>
  );
}
