"use client";

import type { ReactNode } from "react";

/**
 * Fixierte Aktionsleiste am unteren Viewport-Rand, nur über dem Hauptbereich (nicht über der Sidebar).
 * Erwartet `--admin-sidebar-width` auf einem Parent (setzt {@link AdminShell}).
 */
export function AdminFormActionDock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed bottom-0 right-0 z-40 border-t border-[#e5e7eb] bg-white py-3 shadow-[0_-4px_14px_rgba(0,0,0,0.06)] ${className}`}
      style={{
        left: "var(--admin-sidebar-width, 15.5rem)",
      }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 lg:px-8">{children}</div>
    </div>
  );
}
