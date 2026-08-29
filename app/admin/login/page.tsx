import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminAuthState } from "@/lib/auth/admin-auth-state";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import {
  resolveAdminLoginHeroImageUrl,
  resolveAdminLoginTagline,
} from "@/lib/shop/admin-login-branding";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { AdminLoginForm } from "./login-form";
import { LoginHero } from "./login-hero";

export const metadata: Metadata = {
  title: "Anmelden",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const authState = await getAdminAuthState();
  if (authState.status === "ready") redirect("/admin");
  if (authState.status === "mfa_pending") redirect("/admin/login/mfa");

  const settings = await getShopSettings();
  const logoUrl = resolveShopBrandingAssetUrl(settings, "logoLight");
  const shopName = settings.shopName;
  const heroImageUrl = resolveAdminLoginHeroImageUrl(settings);
  const tagline = resolveAdminLoginTagline(settings);

  return (
    <div className="grid min-h-dvh w-full grid-rows-[10rem_1fr] bg-white lg:grid-cols-2 lg:grid-rows-1">
      <LoginHero
        className="row-start-1 min-h-0 lg:col-start-1 lg:min-h-dvh"
        heroImageUrl={heroImageUrl}
        tagline={tagline}
      />
      <div className="row-start-2 flex min-h-0 flex-col justify-center px-6 py-10 sm:px-10 lg:col-start-2 lg:row-start-1 lg:items-center lg:overflow-y-auto lg:px-12 lg:py-14 xl:px-20 2xl:px-24">
        <Suspense
          fallback={
            <div className="w-full max-w-md animate-pulse space-y-4 lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
              <div className="h-10 w-40 rounded bg-zinc-200" />
              <div className="h-8 w-3/4 rounded bg-zinc-100" />
              <div className="h-12 rounded bg-zinc-100" />
              <div className="h-12 rounded bg-zinc-100" />
            </div>
          }
        >
          <AdminLoginForm logoUrl={logoUrl} shopName={shopName} />
        </Suspense>
      </div>
    </div>
  );
}
