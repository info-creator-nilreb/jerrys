import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { AdminDevClientNotice } from "@/components/admin/admin-dev-client-notice";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatAppVersionLabel, getAppVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin | jerry's",
    default: "Administration",
  },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const email = session.user.email ?? "";
  const name = session.user.name?.trim() ?? "";
  const devPort = process.env.PORT ?? "3001";
  const devBaseUrl =
    process.env.NODE_ENV === "development"
      ? (process.env.AUTH_URL ?? `http://localhost:${devPort}`)
      : "";

  return (
    <AdminShell
      appVersion={formatAppVersionLabel(getAppVersion())}
      userEmail={email}
      userName={name || email}
    >
      {process.env.NODE_ENV === "development" ? (
        <AdminDevClientNotice devBaseUrl={devBaseUrl} />
      ) : null}
      {children}
    </AdminShell>
  );
}
