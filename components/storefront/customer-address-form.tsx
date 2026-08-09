"use client";

import Link from "next/link";
import { useActionState } from "react";
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
import {
  customerAddressKindLabel,
  type CustomerAddressKind,
} from "@/features/customers/address";

const initial: CustomerAddressActionState = null;

const selectClass = `${customerAuthInputClass} appearance-none py-[10px]`;

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
}: {
  mode: "create" | "edit";
  kind: CustomerAddressKind;
  addressId?: string;
  initialValues?: CustomerAddressFormValues;
  allowedCountries: { code: string; label: string }[];
}) {
  const action = mode === "create" ? createCustomerAddressAction : updateCustomerAddressAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const fe = state?.fieldErrors;
  const values = initialValues ?? {
    firstName: "",
    lastName: "",
    line1: "",
    zip: "",
    city: "",
    country: allowedCountries[0]?.code ?? "DE",
    isDefault: false,
  };

  const fieldErr = (name: string) => fe?.[name]?.[0];

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
        <label htmlFor="address-label" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
          Bezeichnung (optional)
        </label>
        <input
          id="address-label"
          name="label"
          type="text"
          defaultValue={values.label ?? ""}
          placeholder="z. B. Zuhause, Büro"
          className={customerAuthInputClass}
          aria-invalid={fieldErr("label") ? true : undefined}
        />
        {fieldErr("label") ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErr("label")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-firstName" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
            Vorname <span className="text-primary">*</span>
          </label>
          <input
            id="address-firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            defaultValue={values.firstName}
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
          <label htmlFor="address-lastName" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
            Nachname <span className="text-primary">*</span>
          </label>
          <input
            id="address-lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            defaultValue={values.lastName}
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
        <label htmlFor="address-company" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
          Firma (optional)
        </label>
        <input
          id="address-company"
          name="company"
          type="text"
          autoComplete="organization"
          defaultValue={values.company ?? ""}
          className={customerAuthInputClass}
        />
      </div>

      <div>
        <label htmlFor="address-line1" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
          Straße und Hausnummer <span className="text-primary">*</span>
        </label>
        <input
          id="address-line1"
          name="line1"
          type="text"
          required
          autoComplete="address-line1"
          defaultValue={values.line1}
          className={customerAuthInputClass}
          aria-invalid={fieldErr("line1") ? true : undefined}
        />
        {fieldErr("line1") ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErr("line1")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="address-line2" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
          Adresszusatz (optional)
        </label>
        <input
          id="address-line2"
          name="line2"
          type="text"
          autoComplete="address-line2"
          defaultValue={values.line2 ?? ""}
          className={customerAuthInputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-zip" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
            PLZ <span className="text-primary">*</span>
          </label>
          <input
            id="address-zip"
            name="zip"
            type="text"
            required
            autoComplete="postal-code"
            defaultValue={values.zip}
            className={customerAuthInputClass}
            aria-invalid={fieldErr("zip") ? true : undefined}
          />
          {fieldErr("zip") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("zip")}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="address-city" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
            Ort <span className="text-primary">*</span>
          </label>
          <input
            id="address-city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            defaultValue={values.city}
            className={customerAuthInputClass}
            aria-invalid={fieldErr("city") ? true : undefined}
          />
          {fieldErr("city") ? (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErr("city")}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="address-country" className="mb-1.5 block text-sm font-medium text-(--foreground-heading)">
          Land <span className="text-primary">*</span>
        </label>
        <select
          id="address-country"
          name="country"
          required
          autoComplete="country"
          className={selectClass}
          defaultValue={values.country}
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

      <label className="flex cursor-pointer items-start gap-3 text-sm text-(--foreground-heading)">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={values.isDefault}
          className="mt-0.5 size-4 checkbox-primary"
        />
        <span>Als Standard-{kind === "shipping" ? "Lieferadresse" : "Rechnungsadresse"} verwenden</span>
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
