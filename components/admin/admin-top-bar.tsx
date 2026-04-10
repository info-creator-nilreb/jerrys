"use client";

import { IconBell, IconHelp, IconSearch } from "@/components/admin/admin-nav-icons";

export function AdminTopBar() {
  return (
    <header className="flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-[#e4e6ea] bg-white px-4 lg:gap-4 lg:px-6">
      <div className="flex min-h-10 min-w-0 flex-1 max-w-2xl items-center gap-2 rounded-md border border-[#e4e6ea] bg-[#f7f8fa] px-2 py-1.5 lg:px-3">
        <span className="hidden shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary sm:inline">
          Alle
        </span>
        <IconSearch className="size-4 shrink-0 text-[#9ca3af]" />
        <input
          readOnly
          placeholder="Finde Produkte, Kunden, Bestellungen …"
          className="min-w-0 flex-1 cursor-default bg-transparent text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
          aria-label="Suche (demnächst)"
        />
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className="rounded-lg p-2.5 text-[#6b7280] hover:bg-[#f3f4f6]"
          title="Hilfe"
        >
          <IconHelp className="size-5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2.5 text-[#6b7280] hover:bg-[#f3f4f6]"
          title="Benachrichtigungen"
        >
          <IconBell className="size-5" />
        </button>
      </div>
    </header>
  );
}
