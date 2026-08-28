export function IntegrationStatusPill({
  ready,
  readyLabel = "Bereit",
  pendingLabel = "Noch nicht verbunden",
}: {
  ready: boolean;
  readyLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <p
      className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        ready
          ? "bg-primary/10 text-primary"
          : "bg-amber-50 text-amber-900"
      }`}
      role="status"
    >
      {ready ? readyLabel : pendingLabel}
    </p>
  );
}
