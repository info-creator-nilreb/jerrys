"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar, useSidebarCollapsed } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

export function AdminShell({
  children,
  appVersion,
  userEmail,
  userName,
  termineEnabled = true,
  shopName,
  adminLogoSrc,
}: {
  children: ReactNode;
  appVersion: string;
  userEmail: string;
  userName: string;
  /** Shop-Feature-Flag: Admin-Menüpunkt und Glocken-Termine. */
  termineEnabled?: boolean;
  shopName: string;
  /** Logo für dunkle Sidebar (ShopSettings logoDark). */
  adminLogoSrc: string;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();
  const pathname = usePathname();
  /** Drawer gilt nur für die aktuelle Route — schließt automatisch bei Navigation. */
  const [mobileNavOpenForPath, setMobileNavOpenForPath] = useState<string | null>(null);
  const mobileNavOpen = mobileNavOpenForPath === pathname;

  /** Admin-Shell füllt den Viewport — kein Window-Scroll (sonst Leerraum unter der App). */
  useEffect(() => {
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const sidebarWidth = collapsed ? "4.25rem" : "15.5rem";

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#eef0f3]">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Navigation schließen"
          onClick={() => setMobileNavOpenForPath(null)}
        />
      ) : null}

      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggle}
        appVersion={appVersion}
        userEmail={userEmail}
        userName={userName}
        termineEnabled={termineEnabled}
        shopName={shopName}
        adminLogoSrc={adminLogoSrc}
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpenForPath(null)}
        className={`fixed inset-y-0 left-0 z-50 w-[min(100%,18rem)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      />

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:[--admin-sidebar-width:0px] lg:[--admin-sidebar-width:var(--admin-sidebar-width-lg)]"
        style={
          {
            "--admin-sidebar-width-lg": sidebarWidth,
          } as CSSProperties
        }
      >
        <AdminTopBar
          onOpenMobileNav={() => setMobileNavOpenForPath(pathname)}
          termineEnabled={termineEnabled}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
