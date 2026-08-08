import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/customer-session";

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
  const callbackUrl =
    typeof sp.callbackUrl === "string" && sp.callbackUrl.startsWith("/")
      ? sp.callbackUrl
      : "";
  const qs = new URLSearchParams({ konto: "anmelden" });
  if (callbackUrl && callbackUrl !== "/konto") {
    qs.set("callbackUrl", callbackUrl);
  }
  redirect(`/?${qs.toString()}`);
}
