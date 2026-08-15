"use client";

import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export function AdminMfaLoginForm({
  logoUrl,
  shopName,
}: {
  logoUrl: string;
  shopName: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("admin-mfa", {
        code: code.trim(),
        redirect: false,
        callbackUrl: "/admin",
      });
      if (result?.error) {
        setError("Anmeldung fehlgeschlagen. Bitte Code prüfen.");
        setPending(false);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col lg:max-w-lg">
      <div className="mb-10 flex justify-center lg:mb-12">
        <Image
          src={logoUrl}
          alt={shopName}
          width={220}
          height={110}
          className="h-10 w-auto"
          priority
          unoptimized
        />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[#2d2e32] lg:text-[1.65rem]">
        Zwei-Faktor-Code eingeben
      </h1>
      <p className="mt-3 text-sm text-[#5c5f66]">
        Öffne deine Authenticator-App oder nutze einen unbenutzten Wiederherstellungscode.
      </p>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${formId}-code`} className="text-sm text-[#5c5f66]">
            Code <span className="text-primary">*</span>
          </label>
          <input
            id={`${formId}-code`}
            name="code"
            autoComplete="one-time-code"
            inputMode="text"
            required
            value={code}
            onChange={(ev) => setCode(ev.target.value)}
            className="w-full rounded-md border border-[#e3e4e8] bg-white px-4 py-3.5 text-[0.9375rem] text-[#2d2e32] shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#9ca3af] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            placeholder="123456 oder XXXXX-XXXXX"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-col items-end gap-4 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="min-w-[9.5rem] rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Wird geprüft…" : "Bestätigen"}
          </button>
          <button
            type="button"
            className="text-sm text-primary underline-offset-2 hover:underline"
            onClick={() => void signOut({ callbackUrl: "/admin/login" })}
          >
            Andere Anmeldung
          </button>
        </div>
      </form>
    </div>
  );
}
