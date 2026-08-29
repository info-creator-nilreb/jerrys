import type { CSSProperties } from "react";

/**
 * Tropfen-Pin: die Spitze sitzt auf der Geokoordinate
 * (`left`/`top` + `-translate-x-1/2 -translate-y-full`).
 */
export function MapLocationPin({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 56"
      className={`pointer-events-none absolute z-10 h-[4.5rem] w-16 -translate-x-1/2 -translate-y-full drop-shadow-md ${
        className ?? "text-neutral-900"
      }`}
      style={style}
    >
      <path
        fill="currentColor"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M24 3C14.6 3 7 10.6 7 20c0 12 17 33 17 33s17-21 17-33C41 10.6 33.4 3 24 3zm0 26a9 9 0 110-18 9 9 0 010 18z"
      />
    </svg>
  );
}
