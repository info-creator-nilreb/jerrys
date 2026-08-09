import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerAddressForm } from "@/components/storefront/customer-address-form";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { isCustomerAddressKind } from "@/features/customers/address";
import { getVerifiedActiveCustomerId } from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getAllowedShippingCountriesForStorefront } from "@/lib/shop/shipping-countries-for-storefront";

export const metadata = {
  title: "Neue Adresse",
  robots: { index: false, follow: false },
};

export default async function CustomerAddressNewPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const verifiedId = await getVerifiedActiveCustomerId(session.customerId);
  if (!verifiedId) notFound();

  const sp = await searchParams;
  const kindParam = sp.kind ?? "shipping";
  if (!isCustomerAddressKind(kindParam)) notFound();

  const allowedCountries = await getAllowedShippingCountriesForStorefront();
  if (!allowedCountries.length) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/konto/adressen" className={`${customerAuthSecondaryLinkClass} text-sm`}>
          ← Adressen
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Neue Adresse
        </h1>
      </header>
      <CustomerAddressForm mode="create" kind={kindParam} allowedCountries={allowedCountries} />
    </div>
  );
}
