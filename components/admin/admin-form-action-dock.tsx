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
      className={`fixed bottom-0 right-0 z-40 border-t border-[#e5e7eb] bg-white py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_14px_rgba(0,0,0,0.06)] max-lg:left-0 lg:left-[var(--admin-sidebar-width,15.5rem)] ${className}`}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 sm:px-5 lg:px-8">{children}</div>
    </div>
  );
}
