import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import packageJson from "../../../package.json";

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
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const email = session.user.email ?? "";
  const name = session.user.name?.trim() ?? "";

  return (
    <AdminShell
      appVersion={packageJson.version}
      userEmail={email}
      userName={name || email}
    >
      {children}
    </AdminShell>
  );
}
