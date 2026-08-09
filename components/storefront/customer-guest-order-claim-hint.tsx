import Link from "next/link";
import { PackageSearch } from "lucide-react";

/**
 * Hinweis auf zuordenbare Gastbestellungen. Führt bewusst nur zur Vorschau —
 * zugeordnet wird ausschließlich nach Bestätigung.
 */
export function CustomerGuestOrderClaimHint({ orderCount }: { orderCount: number }) {
  if (orderCount <= 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <PackageSearch className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-(--foreground-heading)">
            {orderCount === 1
              ? "1 frühere Bestellung gefunden"
              : `${orderCount} frühere Bestellungen gefunden`}
          </p>
          <p className="mt-1 text-(--foreground-muted)">
            Ohne Konto aufgegeben, mit deiner bestätigten E-Mail-Adresse. Du kannst sie deinem Konto
            zuordnen.
          </p>
        </div>
      </div>
      <Link
        href="/konto/bestellungen/zuordnen"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        Ansehen und zuordnen
      </Link>
    </div>
  );
}
