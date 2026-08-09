"use client";

import { normalizeCustomerAuthTokenFromClient } from "@/features/customers/password";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CustomerVerifyEmailForm } from "@/components/storefront/customer-verify-email-form";

function readTokenFromHash(): string {
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) return "";
  if (hash.startsWith("token=")) {
    return normalizeCustomerAuthTokenFromClient(decodeURIComponent(hash.slice("token=".length)));
  }
  return normalizeCustomerAuthTokenFromClient(decodeURIComponent(hash));
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHashTokenSnapshot(): string {
  return readTokenFromHash();
}

function getHashTokenServerSnapshot(): string {
  return "";
}

export function CustomerVerifyEmailLanding() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token");
  const hashToken = useSyncExternalStore(
    subscribeToHash,
    getHashTokenSnapshot,
    getHashTokenServerSnapshot,
  );

  const token = queryToken
    ? normalizeCustomerAuthTokenFromClient(queryToken)
    : hashToken;

  if (!token) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Ungültiger Bestätigungslink. Bitte die neueste E-Mail von jerry&apos;s öffnen oder dich
        erneut registrieren, um einen neuen Link zu erhalten.
      </p>
    );
  }

  return <CustomerVerifyEmailForm token={token} />;
}
