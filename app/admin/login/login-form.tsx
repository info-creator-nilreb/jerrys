"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

function EyeIcon({ open }: { open: boolean }) {
  const Cmp = open ? EyeOff : Eye;
  return <Cmp className="size-5" aria-hidden strokeWidth={1.75} />;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const formId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.");
        setPending(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
      <div className="mb-10 flex justify-center lg:mb-12">
        <Image
          src="/branding/jerrys-wordmark.jpg"
          alt="jerry's"
          width={220}
          height={110}
          className="h-10 w-auto"
          priority
          unoptimized
        />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[#2d2e32] lg:text-[1.65rem] lg:leading-snug">
        Melde dich im Admin-Bereich an
      </h1>

      <form id={formId} method="post" onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${formId}-email`} className="text-sm text-[#5c5f66]">
            E-Mail <span className="text-primary">*</span>
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Gib deine E-Mail ein …"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-md border border-[#e3e4e8] bg-white px-4 py-3.5 text-[0.9375rem] text-[#2d2e32] shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#9ca3af] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${formId}-password`} className="text-sm text-[#5c5f66]">
            Passwort <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id={`${formId}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Gib dein Passwort ein …"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-md border border-[#e3e4e8] bg-white py-3.5 pr-12 pl-4 text-[0.9375rem] text-[#2d2e32] shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#9ca3af] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-[#8b8f98] transition-colors hover:bg-[#f4f5f7] hover:text-[#5c5f66]"
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              aria-pressed={showPassword}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#2d2e32] select-none">
          <input
            type="checkbox"
            name="remember"
            className="size-4 shrink-0 rounded border-[#cfd2d8] text-primary focus:ring-primary/30"
          />
          Angemeldet bleiben
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col items-end gap-4 pt-1">
          <span
            className="cursor-default text-sm text-primary"
            title="Passwort-Reset ist noch nicht eingerichtet."
          >
            Hast du dein Passwort vergessen?
          </span>
          <button
            type="submit"
            disabled={pending}
            className="min-w-[9.5rem] rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary"
          >
            {pending ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </div>
      </form>
    </div>
  );
}
