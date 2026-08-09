import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerAddressForm } from "@/components/storefront/customer-address-form";
import { customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import {
  getCustomerAddressForCustomer,
  getVerifiedActiveCustomerId,
} from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getShippingCountriesForStorefront } from "@/lib/shop/shipping-countries-for-storefront";

export const metadata = {
  title: "Adresse bearbeiten",
  robots: { index: false, follow: false },
};

export default async function CustomerAddressEditPage({
  params,
}: {
  params: Promise<{ addressId: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) return null;

  const verifiedId = await getVerifiedActiveCustomerId(session.customerId);
  if (!verifiedId) notFound();

  const { addressId } = await params;
  const address = await getCustomerAddressForCustomer(session.customerId, addressId);
  if (!address) notFound();

  const { countries, preferredCountry } = await getShippingCountriesForStorefront();
  if (!countries.length) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link href="/konto/adressen" className={`${customerAuthSecondaryLinkClass} text-sm`}>
          ← Adressen
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-(--foreground-heading)">
          Adresse bearbeiten
        </h1>
      </header>
      <CustomerAddressForm
        mode="edit"
        kind={address.kind}
        addressId={address.id}
        allowedCountries={countries}
        preferredCountry={preferredCountry}
        initialValues={{
          label: address.label,
          firstName: address.firstName,
          lastName: address.lastName,
          company: address.company,
          line1: address.line1,
          line2: address.line2,
          zip: address.zip,
          city: address.city,
          country: address.country,
          isDefault: address.isDefault,
        }}
      />
    </div>
  );
}
