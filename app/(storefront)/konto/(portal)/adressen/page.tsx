import Link from "next/link";
import {
  CustomerAddressDeleteForm,
  CustomerAddressSetDefaultForm,
} from "@/components/storefront/customer-address-list-actions";
import {
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  getVerifiedActiveCustomerId,
  listCustomerAddresses,
} from "@/features/customers";

export const metadata = {
  title: "Adressen",
  robots: { index: false, follow: false },
};

export default async function CustomerAddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ gespeichert?: string; geloescht?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const sp = await searchParams;
  const savedBanner = sp.gespeichert === "1";
  const deletedBanner = sp.geloescht === "1";

  const verifiedId = await getVerifiedActiveCustomerId(session.customerId);

  let loadError: string | null = null;
  let addresses: Awaited<ReturnType<typeof listCustomerAddresses>> = [];
  if (verifiedId) {
    try {
      addresses = await listCustomerAddresses(session.customerId);
    } catch {
      loadError = "Adressen konnten gerade nicht geladen werden. Bitte später erneut versuchen.";
    }
  }

  const shipping = addresses.filter((a) => a.kind === "shipping");
  const billing = addresses.filter((a) => a.kind === "billing");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--foreground-heading)">
            Adressen
          </h1>
          <p className="mt-2 text-sm text-(--foreground-muted)">
            Liefer- und Rechnungsadressen für den Checkout. Bestellungen behalten unveränderte
            Adress-Snapshots.
          </p>
        </div>
        {verifiedId ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/konto/adressen/neu?kind=shipping"
              className={`${customerAuthPrimaryButtonClass} w-auto px-4`}
            >
              Lieferadresse
            </Link>
            <Link
              href="/konto/adressen/neu?kind=billing"
              className={`${customerAuthPrimaryButtonClass} w-auto px-4`}
            >
              Rechnungsadresse
            </Link>
          </div>
        ) : null}
      </header>

      {savedBanner ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          Adresse gespeichert.
        </p>
      ) : null}
      {deletedBanner ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
          Adresse gelöscht.
        </p>
      ) : null}

      {!verifiedId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
          <p className="font-medium">E-Mail bestätigen</p>
          <p className="mt-2">
            Adressen kannst du anlegen, sobald deine E-Mail-Adresse verifiziert ist. Prüfe dein Postfach
            oder fordere eine neue Bestätigungsmail an.
          </p>
          <Link href="/konto" className={`${customerAuthSecondaryLinkClass} mt-4 inline-block`}>
            Zur Konto-Übersicht
          </Link>
        </div>
      ) : loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      ) : addresses.length === 0 ? (
        <div className="rounded-md border border-(--surface-muted) bg-(--surface-soft) px-4 py-8 text-sm text-(--foreground-muted)">
          <p className="font-medium text-(--foreground-heading)">Noch keine Adressen</p>
          <p className="mt-2">
            Lege mindestens eine Lieferadresse an — beim Checkout werden Standardadressen automatisch
            übernommen.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <AddressSection title="Lieferadressen" emptyHint="Noch keine Lieferadresse." addresses={shipping} />
          <AddressSection title="Rechnungsadressen" emptyHint="Noch keine Rechnungsadresse — im Checkout kann die Lieferadresse genutzt werden." addresses={billing} />
        </div>
      )}
    </div>
  );
}

function AddressSection({
  title,
  emptyHint,
  addresses,
}: {
  title: string;
  emptyHint: string;
  addresses: Awaited<ReturnType<typeof listCustomerAddresses>>;
}) {
  return (
    <section aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`} className="text-base font-semibold text-(--foreground-heading)">
        {title}
      </h2>
      {addresses.length === 0 ? (
        <p className="mt-3 text-sm text-(--foreground-muted)">{emptyHint}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-md border border-(--surface-muted) px-4 py-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {address.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Standard
                      </span>
                    ) : null}
                    {address.label ? (
                      <span className="font-medium text-(--foreground-heading)">{address.label}</span>
                    ) : null}
                  </div>
                  <p className="font-medium text-(--foreground-heading)">
                    {address.firstName} {address.lastName}
                  </p>
                  {address.company ? (
                    <p className="text-(--foreground-muted)">{address.company}</p>
                  ) : null}
                  <p className="text-(--foreground-muted)">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="text-(--foreground-muted)">
                    {address.zip} {address.city}, {address.country}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {!address.isDefault ? <CustomerAddressSetDefaultForm addressId={address.id} /> : null}
                  <Link
                    href={`/konto/adressen/${encodeURIComponent(address.id)}`}
                    className={customerAuthSecondaryLinkClass}
                  >
                    Bearbeiten
                  </Link>
                  <CustomerAddressDeleteForm addressId={address.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
