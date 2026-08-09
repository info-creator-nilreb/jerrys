"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createCustomerAddressAction,
  updateCustomerAddressAction,
  type CustomerAddressActionState,
} from "@/app/(storefront)/konto/address-actions";
import {
  customerAuthInputClass,
  customerAuthPrimaryButtonClass,
  customerAuthSecondaryLinkClass,
} from "@/components/storefront/customer-auth-shell";
import { SmartAddressFields } from "@/components/storefront/smart-address-fields";
import {
  customerAddressKindLabel,
  type CustomerAddressKind,
} from "@/features/customers/address";

const initial: CustomerAddressActionState = null;

const selectClass = `${customerAuthInputClass} appearance-none`;
const labelClass = "mb-1.5 block text-sm font-medium text-(--foreground-heading)";

export type CustomerAddressFormValues = {
  label?: string | null;
  firstName: string;
  lastName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  zip: string;
  city: string;
  country: string;
  isDefault: boolean;
};

export function CustomerAddressForm({
  mode,
  kind,
  addressId,
  initialValues,
  allowedCountries,
  preferredCountry,
}: {
  mode: "create" | "edit";
  kind: CustomerAddressKind;
  addressId?: string;
  initialValues?: CustomerAddressFormValues;
  allowedCountries: { code: string; label: string }[];
  /** Vorauswahl beim Anlegen (Geo bzw. DE) — bei „Bearbeiten“ gewinnt der gespeicherte Wert. */
  preferredCountry: string;
}) {
  const action = mode === "create" ? createCustomerAddressAction : updateCustomerAddressAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const fe = state?.fieldErrors;
  const fieldErr = (name: string) => fe?.[name]?.[0];

  const [country, setCountry] = useState(initialValues?.country ?? preferredCountry);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {mode === "edit" && addressId ? (
        <input type="hidden" name="addressId" value={addressId} />
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}

      <p className="text-sm text-(--foreground-muted)">
        {customerAddressKindLabel(kind)}
        {mode === "create" ? " anlegen" : " bearbeiten"}
      </p>

      {state && !state.ok ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="label" className={labelClass}>
          Bezeichnung (optional)
        </label>
        <input
          id="label"
          name="label"
          type="text"
          defaultValue={initialValues?.label ?? ""}
          placeholder="z. B. Zuhause, Büro"
          className={customerAuthInputClass}
        />
        {fieldErr("label") ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErr("label")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            Vorname <span className="text-primary">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            defaultValue={initialValues?.firstName ?? ""}
            className={customerAuthInputClass}
            aria-invalid={fieldErr("firstName") ? true : undefined}
          />
          {fieldErr("firstName") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("firstName")}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Nachname <span className="text-primary">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            defaultValue={initialValues?.lastName ?? ""}
            className={customerAuthInputClass}
            aria-invalid={fieldErr("lastName") ? true : undefined}
          />
          {fieldErr("lastName") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("lastName")}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="company" className={labelClass}>
          Firma (optional)
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          defaultValue={initialValues?.company ?? ""}
          className={customerAuthInputClass}
        />
      </div>

      <div>
        <label htmlFor="country" className={labelClass}>
          Land <span className="text-primary">*</span>
        </label>
        <select
          id="country"
          name="country"
          required
          autoComplete="country"
          className={selectClass}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-invalid={fieldErr("country") ? true : undefined}
        >
          {allowedCountries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        {fieldErr("country") ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErr("country")}
          </p>
        ) : null}
      </div>

      <SmartAddressFields
        country={country}
        names={{ zip: "zip", city: "city", line1: "line1", line2: "line2" }}
        labels={{
          zip: "PLZ",
          city: "Ort",
          line1: "Straße und Hausnummer",
          line2: "Adresszusatz (optional)",
        }}
        defaultValues={{
          zip: initialValues?.zip ?? "",
          city: initialValues?.city ?? "",
          line1: initialValues?.line1 ?? "",
          line2: initialValues?.line2 ?? "",
        }}
        serverErrors={{
          zip: fieldErr("zip"),
          city: fieldErr("city"),
          line1: fieldErr("line1"),
        }}
        required
        requiredMarker={<span className="text-primary">*</span>}
        inputClass={customerAuthInputClass}
        labelClass={labelClass}
      />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-(--foreground-heading)">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={initialValues?.isDefault ?? false}
          className="mt-0.5 size-4 checkbox-primary"
        />
        <span>
          Als Standard-{kind === "shipping" ? "Lieferadresse" : "Rechnungsadresse"} verwenden
        </span>
      </label>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} className={`${customerAuthPrimaryButtonClass} sm:w-auto sm:px-8`}>
          {pending ? "Speichern …" : "Speichern"}
        </button>
        <Link href="/konto/adressen" className={customerAuthSecondaryLinkClass}>
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
