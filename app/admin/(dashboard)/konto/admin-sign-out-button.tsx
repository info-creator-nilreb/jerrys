"use client";

import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button
      type="button"
      className="min-h-11 text-sm font-medium text-[#6b7280] underline-offset-2 transition-colors hover:text-[#1f2937] hover:underline"
      onClick={() => void signOut({ callbackUrl: "/admin/login" })}
    >
      Abmelden
    </button>
  );
}
