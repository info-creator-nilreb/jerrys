type UspIconVariant = "design" | "germany" | "heart";

const iconClass =
  "size-10 shrink-0 text-primary [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-[1.35]";

function Svg(props: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {props.children}
    </svg>
  );
}

/** Auszeichnung / Designqualität: schlanker Fünfstern */
function IconDesign() {
  return (
    <Svg>
      <path d="M12 2.25 15.09 8.51 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2.25z" />
    </Svg>
  );
}

/** Standort Deutschland: schlanke Stecknadel */
function IconGermany() {
  return (
    <Svg>
      <path d="M12 21.5s7.5-5.1 7.5-11.2a7.5 7.5 0 10-15 0c0 6.1 7.5 11.2 7.5 11.2z" />
      <circle cx="12" cy="10.3" r="2.2" />
    </Svg>
  );
}

/** Engagement Tierschutz */
function IconHeart() {
  return (
    <Svg>
      <path d="M20.8 8.6c0 5.65-8.8 10.9-8.8 10.9S3.2 14.25 3.2 8.6a4.9 4.9 0 019.1-2.45A4.9 4.9 0 0120.8 8.6z" />
    </Svg>
  );
}

export function UspIcon({ variant }: { variant: UspIconVariant }) {
  return (
    <span className={iconClass}>
      {variant === "design" ? <IconDesign /> : null}
      {variant === "germany" ? <IconGermany /> : null}
      {variant === "heart" ? <IconHeart /> : null}
    </span>
  );
}
