import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminAuthState } from "@/lib/auth/admin-auth-state";
import { AdminDevClientNotice } from "@/components/admin/admin-dev-client-notice";
import { AdminShell } from "@/components/admin/admin-shell";
import { formatAppVersionLabel, getAppVersion } from "@/lib/app-version";
import { resolveAdminMetadataTitleTemplate } from "@/lib/shop/admin-login-branding";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";

export async function generateMetadata(): Promise<Metadata> {
  const shopSettings = await getShopSettings();
  return {
    title: {
      template: resolveAdminMetadataTitleTemplate(shopSettings),
      default: "Administration",
    },
    robots: { index: false, follow: false },
  };
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getAdminAuthState();
  if (authState.status === "none") {
    redirect("/admin/login");
  }
  if (authState.status === "mfa_pending") {
    redirect("/admin/login/mfa");
  }
  const session = authState.session;

  const email = session.user.email ?? "";
  const name = session.user.name?.trim() ?? "";
  const devPort = process.env.PORT ?? "3001";
  const devBaseUrl =
    process.env.NODE_ENV === "development"
      ? (process.env.AUTH_URL ?? `http://localhost:${devPort}`)
      : "";

  const termineEnabled = await isTermineFeatureEnabled();
  const shopSettings = await getShopSettings();
  const adminLogoSrc = resolveShopBrandingAssetUrl(shopSettings, "logoDark");

  return (
    <AdminShell
      appVersion={formatAppVersionLabel(getAppVersion())}
      userEmail={email}
      userName={name || email}
      termineEnabled={termineEnabled}
      shopName={shopSettings.shopName}
      adminLogoSrc={adminLogoSrc}
    >
      {process.env.NODE_ENV === "development" ? (
        <AdminDevClientNotice devBaseUrl={devBaseUrl} />
      ) : null}
      {children}
    </AdminShell>
  );
}
