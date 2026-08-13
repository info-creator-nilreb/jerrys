/** Drei pulsierende Punkte für Auth-Wartezustände (Login-Übergang). */
export function AuthPendingDots({
  label = "Bitte warten…",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="auth-pending-dot size-2 rounded-full bg-primary" />
        <span className="auth-pending-dot size-2 rounded-full bg-primary [animation-delay:160ms]" />
        <span className="auth-pending-dot size-2 rounded-full bg-primary [animation-delay:320ms]" />
      </span>
      <p className="text-sm text-(--foreground-muted)">{label}</p>
    </div>
  );
}
