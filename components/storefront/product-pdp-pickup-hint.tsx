"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { PickupDisplayCopy } from "@/lib/shop/pickup-settings";

export function ProductPdpPickupHint({
  pickupCopy,
}: {
  pickupCopy: PickupDisplayCopy;
}) {
  return (
    <div className="border-t border-(--surface-muted) pt-4">
      <div className="flex gap-2.5 text-sm">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden strokeWidth={1.5} />
        <div className="min-w-0 leading-snug">
          <p className="text-(--foreground-heading)">
            Abholung möglich unter {pickupCopy.storeLabel}
          </p>
          <p className="mt-0.5 text-(--foreground-muted)">{pickupCopy.readyText}</p>
          {pickupCopy.infoUrl ? (
            <Link
              href={pickupCopy.infoUrl}
              className="mt-1 inline-block text-sm font-medium text-primary underline-offset-2 hover:text-(--primary-hover) hover:underline"
            >
              Ladeninformationen anzeigen
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
