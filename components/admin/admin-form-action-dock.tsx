"use client";

import type { ReactNode } from "react";

/**
 * Unterer Abstand im Formular-/Seiteninhalt, damit der fixed Dock nichts verdeckt.
 * Standard für alle Admin-Formulare mit Speichern-Aktion.
 */
export const ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING = "pb-28";

/**
 * Fixierte Aktionsleiste am unteren Viewport-Rand (Sticky-Save-Footer).
 * Standard für Admin-Seiten mit Speichern — nur über dem Hauptbereich, nicht über der Sidebar.
 * Erwartet `--admin-sidebar-width` auf einem Parent (setzt {@link AdminShell}).
 *
 * Hinweis: Der Dock ist `position: fixed` und nimmt keinen Fluss-Platz ein —
 * Formulare brauchen {@link ADMIN_FORM_ACTION_DOCK_CONTENT_PADDING}.
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
      data-admin-form-action-dock
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:px-8 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:w-full [&>a]:items-center [&>a]:justify-center [&>a]:sm:w-auto [&>button]:inline-flex [&>button]:min-h-11 [&>button]:w-full [&>button]:items-center [&>button]:justify-center [&>button]:sm:w-auto">
        {children}
      </div>
    </div>
  );
}
