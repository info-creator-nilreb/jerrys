"use server";

import { redirect } from "next/navigation";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/features/customers";
import { getCustomerSession } from "@/lib/auth/customer-session";

export type CustomerAddressActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
} | null;

async function requireSessionCustomerId(): Promise<string | null> {
  const session = await getCustomerSession();
  return session?.customerId ?? null;
}

function formObject(formData: FormData): Record<string, unknown> {
  return {
    kind: formData.get("kind"),
    label: formData.get("label"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    company: formData.get("company"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    country: formData.get("country"),
    isDefault: formData.get("isDefault"),
  };
}

export async function createCustomerAddressAction(
  _prev: CustomerAddressActionState,
  formData: FormData,
): Promise<CustomerAddressActionState> {
  const customerId = await requireSessionCustomerId();
  if (!customerId) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const result = await createCustomerAddress(customerId, formObject(formData));
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  redirect("/konto/adressen?gespeichert=1");
}

export async function updateCustomerAddressAction(
  _prev: CustomerAddressActionState,
  formData: FormData,
): Promise<CustomerAddressActionState> {
  const customerId = await requireSessionCustomerId();
  if (!customerId) {
    return { ok: false, message: "Bitte zuerst anmelden." };
  }

  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId) {
    return { ok: false, message: "Adresse nicht gefunden." };
  }

  const result = await updateCustomerAddress(customerId, addressId, formObject(formData));
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  redirect("/konto/adressen?gespeichert=1");
}

export async function deleteCustomerAddressAction(formData: FormData): Promise<void> {
  const customerId = await requireSessionCustomerId();
  if (!customerId) redirect("/konto/anmelden?callbackUrl=/konto/adressen");

  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId) redirect("/konto/adressen");

  await deleteCustomerAddress(customerId, addressId);
  redirect("/konto/adressen?geloescht=1");
}

export async function setDefaultCustomerAddressAction(formData: FormData): Promise<void> {
  const customerId = await requireSessionCustomerId();
  if (!customerId) redirect("/konto/anmelden?callbackUrl=/konto/adressen");

  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId) redirect("/konto/adressen");

  await setDefaultCustomerAddress(customerId, addressId);
  redirect("/konto/adressen");
}
