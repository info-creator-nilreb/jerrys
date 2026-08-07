"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

/**
 * Tabellenzeile zur Bestelldetailseite — Klick auf die Zeile oder Link „Öffnen“ (sichtbarer Pfeil).
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

  const navigate = () => router.push(href);

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a")) return;
    navigate();
  };

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      className="cursor-pointer bg-white hover:bg-[#f7f8fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate();
        }
      }}
    >
      {children}
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="hidden sm:inline">Öffnen</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
