import { Suspense } from "react";
import { AdminLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Mit Administrator-Konto anmelden.
      </p>
      <Suspense fallback={<p className="text-sm text-zinc-500">Laden…</p>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
