import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerRegisterForm } from "@/components/storefront/customer-register-form";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata = {
  title: "Registrieren",
  robots: { index: false, follow: false },
};

export default async function CustomerRegisterPage() {
  const session = await getCustomerSession();
  if (session) redirect("/konto");

  return (
    <CustomerAuthShell
      title="Konto erstellen"
      description="Nach der Registrierung bestätigst du deine E-Mail. Bestellungen ohne Konto bleiben unverändert möglich."
      footer={
        <p>
          Bereits registriert?{" "}
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Anmelden
          </Link>
        </p>
      }
    >
      <CustomerRegisterForm />
    </CustomerAuthShell>
  );
}
