import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";
import { CustomerLoginForm } from "@/components/storefront/customer-login-form";
import { getCustomerSession } from "@/lib/auth/customer-session";

export const metadata = {
  title: "Anmelden",
  robots: { index: false, follow: false },
};

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getCustomerSession();
  if (session) redirect("/konto");

  const sp = await searchParams;
  const callbackUrl =
    typeof sp.callbackUrl === "string" && sp.callbackUrl.startsWith("/")
      ? sp.callbackUrl
      : "/konto";

  return (
    <CustomerAuthShell
      title="Anmelden"
      description="Melde dich mit Passwort oder Magic Link an. Gast-Checkout bleibt ohne Konto möglich."
      footer={
        <p>
          Noch kein Konto?{" "}
          <Link href="/konto/registrieren" className={customerAuthSecondaryLinkClass}>
            Registrieren
          </Link>
        </p>
      }
    >
      <CustomerLoginForm callbackUrl={callbackUrl} />
    </CustomerAuthShell>
  );
}
