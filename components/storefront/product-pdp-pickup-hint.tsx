"use client";

import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import type { PickupDisplayCopy } from "@/lib/shop/pickup-store-shared";

export function ProductPdpPickupHint({
  pickupCopy,
}: {
  pickupCopy: PickupDisplayCopy;
}) {
  const storeName = pickupCopy.store.name;

  return (
    <div className="border-t border-(--surface-muted) pt-4">
      <div className="flex gap-2.5 text-sm">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden strokeWidth={1.5} />
        <div className="min-w-0 leading-snug">
          <p className="text-(--foreground-heading)">
            Abholung bei{" "}
            <span className="group/store relative inline">
              <Link
                href={pickupCopy.storeHref}
                className="font-medium text-primary underline-offset-2 hover:text-(--primary-hover) hover:underline"
              >
                {storeName}
              </Link>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-(--surface-muted) bg-white p-3 text-left text-xs leading-relaxed text-(--foreground-muted) opacity-0 shadow-lg transition-opacity duration-150 group-hover/store:pointer-events-auto group-hover/store:opacity-100 group-focus-within/store:pointer-events-auto group-focus-within/store:opacity-100"
              >
                <span className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                  <span>{pickupCopy.formattedAddress}</span>
                </span>
                <a
                  href={pickupCopy.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto mt-2 inline-block font-medium text-primary hover:text-(--primary-hover) hover:underline"
                >
                  In Google Maps öffnen
                </a>
              </span>
            </span>
          </p>
          <p className="mt-0.5 text-(--foreground-muted)">{pickupCopy.readyText}</p>
        </div>
      </div>
    </div>
  );
}
