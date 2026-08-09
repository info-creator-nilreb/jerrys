export function AdminWorkshopSchemaBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-semibold">Datenbank-Migration ausstehend</p>
      <p className="mt-2">{message}</p>
      <p className="mt-2 font-mono text-xs text-amber-900">
        npm run db:migrate:deploy
      </p>
    </div>
  );
}
