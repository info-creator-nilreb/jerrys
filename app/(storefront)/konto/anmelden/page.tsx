import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { safeInternalPath } from "@/lib/http/request-pathname";

export const metadata = {
  title: "Anmelden",
  robots: { index: false, follow: false },
};

/** Deep-Link: öffnet das schlanke Login-Popover auf der Startseite. */
export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getCustomerSession();
  if (session) redirect("/konto");

  const sp = await searchParams;
  const callbackUrl = safeInternalPath(sp.callbackUrl, "");
  const qs = new URLSearchParams({ konto: "anmelden" });
  // Ziel mitnehmen: Das Popover leitet nach dem Login genau dorthin weiter.
  if (callbackUrl) qs.set("callbackUrl", callbackUrl);
  redirect(`/?${qs.toString()}`);
}
