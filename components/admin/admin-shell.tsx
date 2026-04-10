"use client";

import type { CSSProperties, ReactNode } from "react";
import { AdminSidebar, useSidebarCollapsed } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

export function AdminShell({
  children,
  appVersion,
  userEmail,
  userName,
}: {
  children: ReactNode;
  appVersion: string;
  userEmail: string;
  userName: string;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="flex h-dvh overflow-hidden bg-[#eef0f3]">
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggle}
        appVersion={appVersion}
        userEmail={userEmail}
        userName={userName}
      />
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={
          {
            "--admin-sidebar-width": collapsed ? "4.25rem" : "15.5rem",
          } as CSSProperties
        }
      >
        <AdminTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
