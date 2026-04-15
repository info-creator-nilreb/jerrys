"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Ganze Tabellenzeile als Link zur Bestelldetailseite (Tastatur: Enter/Leertaste).
 */
export function OrderTableRowLink({
  href,
  ariaLabel,
  children,
}: {
  href: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      className="cursor-pointer bg-white hover:bg-[#f7f8fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </tr>
  );
}
