"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="mt-6 rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
    >
      Abmelden
    </button>
  );
}
