"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  deleteCustomerAddressAction,
  setDefaultCustomerAddressAction,
} from "@/app/(storefront)/konto/address-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-red-700 disabled:opacity-50"
        aria-label="Adresse löschen"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      <ConfirmDialog
        open={open}
        title="Adresse löschen?"
        description="Diese Adresse wirklich löschen?"
        confirmLabel="Löschen"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          startTransition(async () => {
            const fd = new FormData();
            fd.set("addressId", addressId);
            await deleteCustomerAddressAction(fd);
          });
        }}
      />
    </>
  );
}
