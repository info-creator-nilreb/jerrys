"use client";

import { Trash2 } from "lucide-react";
import {
  deleteCustomerAddressAction,
  setDefaultCustomerAddressAction,
} from "@/app/(storefront)/konto/address-actions";

export function CustomerAddressSetDefaultForm({ addressId }: { addressId: string }) {
  return (
    <form action={setDefaultCustomerAddressAction}>
      <input type="hidden" name="addressId" value={addressId} />
      <button
        type="submit"
        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Als Standard setzen
      </button>
    </form>
  );
}

export function CustomerAddressDeleteForm({ addressId }: { addressId: string }) {
  return (
    <form
      action={deleteCustomerAddressAction}
      onSubmit={(e) => {
        if (!confirm("Diese Adresse wirklich löschen?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="addressId" value={addressId} />
      <button
        type="submit"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-red-700"
        aria-label="Adresse löschen"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
