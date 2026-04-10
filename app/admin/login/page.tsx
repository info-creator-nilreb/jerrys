import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "./login-form";
import { LoginHero } from "./login-hero";

export const metadata: Metadata = {
  title: "Anmelden",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-dvh w-full grid-rows-[10rem_1fr] bg-white lg:grid-cols-2 lg:grid-rows-1">
      <LoginHero className="row-start-1 min-h-0 lg:col-start-1 lg:min-h-dvh" />
      <div className="row-start-2 flex min-h-0 flex-col justify-center px-6 py-10 sm:px-10 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto lg:px-16 lg:py-14">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-md animate-pulse space-y-4">
              <div className="h-10 w-40 rounded bg-zinc-200" />
              <div className="h-8 w-3/4 rounded bg-zinc-200" />
              <div className="h-12 rounded bg-zinc-100" />
              <div className="h-12 rounded bg-zinc-100" />
            </div>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
