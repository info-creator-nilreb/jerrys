import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { CustomerAuthShell, customerAuthSecondaryLinkClass } from "@/components/storefront/customer-auth-shell";

export const metadata = {
  title: "Magic Link",
  robots: { index: false, follow: false },
};

export default async function CustomerMagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  if (!token) {
    return (
      <CustomerAuthShell title="Magic Link">
        <p className="text-sm text-red-600" role="alert">
          Ungültiger Anmelde-Link.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Zur Anmeldung
          </Link>
        </p>
      </CustomerAuthShell>
    );
  }

  try {
    await signIn("customer-magic-link", {
      token,
      redirectTo: "/konto",
    });
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest?: unknown }).digest === "string" &&
      String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return (
      <CustomerAuthShell title="Magic Link">
        <p className="text-sm text-red-600" role="alert">
          Ungültiger oder abgelaufener Anmelde-Link.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/konto/anmelden" className={customerAuthSecondaryLinkClass}>
            Zur Anmeldung
          </Link>
        </p>
      </CustomerAuthShell>
    );
  }

  redirect("/konto");
}
