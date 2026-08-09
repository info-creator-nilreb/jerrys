export function AdminWorkshopSchemaBanner({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-semibold">Datenbank-Migration ausstehend (Vercel/Supabase)</p>
      <p className="mt-2">{message}</p>
      {hint ? <p className="mt-2 text-amber-900">{hint}</p> : null}
      <p className="mt-3 font-mono text-xs text-amber-900">npm run db:migrate:deploy</p>
    </div>
  );
}
