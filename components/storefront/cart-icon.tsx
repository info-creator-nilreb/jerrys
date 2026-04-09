/**
 * Warenkorb wie im Altprojekt: Griff (kurz waagrecht links, dann schräg zum Korb),
 * geschlossenes Trapez (Oberkante waagrecht, Seiten nach innen, Boden waagrecht),
 * zwei gefüllte Punkträder.
 */
export function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 6.2h2.35l.1 1.8" />
      <path d="M6.45 8h9.5l-1.9 8.65h-5.7L6.45 8z" />
      <circle cx="9.1" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13.25" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
