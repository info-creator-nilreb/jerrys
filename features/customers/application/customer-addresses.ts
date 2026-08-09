import { getPrisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logging/logger";
import type { ZodError } from "zod";
import {
  customerAddressCreateSchema,
  customerAddressUpdateSchema,
} from "@/features/customers/application/customer-address-schemas";
import { getVerifiedActiveCustomerId } from "@/features/customers/application/get-verified-active-customer-id";
import {
  customerAddressKindLabel,
  type CustomerAddressKind,
} from "@/features/customers/domain/customer-address";

const log = createLogger("customers.addresses");

export type CustomerAddressListItem = {
  id: string;
  kind: CustomerAddressKind;
  kindLabel: string;
  label: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
  isDefault: boolean;
};

export type CustomerAddressDetail = CustomerAddressListItem;

export type CheckoutAddressPrefill = {
  email: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany?: string;
  shippingLine1: string;
  shippingLine2?: string;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  billingUseShipping: "yes" | "no";
  billingFirstName?: string;
  billingLastName?: string;
  billingCompany?: string;
  billingLine1?: string;
  billingLine2?: string;
  billingZip?: string;
  billingCity?: string;
  billingCountry?: string;
};

function mapRow(row: {
  id: string;
  kind: string;
  label: string | null;
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
  isDefault: boolean;
}): CustomerAddressListItem {
  const kind = row.kind as CustomerAddressKind;
  return {
    id: row.id,
    kind,
    kindLabel: customerAddressKindLabel(kind),
    label: row.label,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    line1: row.line1,
    line2: row.line2,
    zip: row.zip,
    city: row.city,
    country: row.country,
    isDefault: row.isDefault,
  };
}

async function requireVerifiedCustomer(customerId: string): Promise<string | null> {
  return getVerifiedActiveCustomerId(customerId);
}

async function clearDefaultForKind(
  tx: Pick<ReturnType<typeof getPrisma>, "customerAddress">,
  customerId: string,
  kind: CustomerAddressKind,
  exceptId?: string,
): Promise<void> {
  await tx.customerAddress.updateMany({
    where: {
      customerId,
      kind,
      isDefault: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}

export async function listCustomerAddresses(customerId: string): Promise<CustomerAddressListItem[]> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return [];

  const rows = await getPrisma().customerAddress.findMany({
    where: { customerId: verified },
    orderBy: [{ kind: "asc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapRow);
}

export async function getCustomerAddressForCustomer(
  customerId: string,
  addressId: string,
): Promise<CustomerAddressDetail | null> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return null;

  const row = await getPrisma().customerAddress.findFirst({
    where: { id: addressId, customerId: verified },
  });
  return row ? mapRow(row) : null;
}

export type MutateCustomerAddressResult =
  | { ok: true; addressId: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function fieldErrorsFromZod(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] != null ? String(issue.path[0]) : "_form";
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key]!.push(issue.message);
  }
  return fieldErrors;
}

export async function createCustomerAddress(
  customerId: string,
  input: unknown,
): Promise<MutateCustomerAddressResult> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return { ok: false, message: "Konto nicht verifiziert oder deaktiviert." };

  const parsed = customerAddressCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const prisma = getPrisma();
  const kind = parsed.data.kind as CustomerAddressKind;
  const existingCount = await prisma.customerAddress.count({
    where: { customerId: verified, kind },
  });
  const makeDefault = parsed.data.isDefault || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await clearDefaultForKind(tx, verified, kind);
    }
    return tx.customerAddress.create({
      data: {
        customerId: verified,
        kind,
        label: parsed.data.label ?? null,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        company: parsed.data.company ?? null,
        line1: parsed.data.line1,
        line2: parsed.data.line2 ?? null,
        zip: parsed.data.zip,
        city: parsed.data.city,
        country: parsed.data.country,
        isDefault: makeDefault,
      },
    });
  });

  log.info("customer_address_created", { customerId: verified, addressId: created.id, kind });
  return { ok: true, addressId: created.id };
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  input: unknown,
): Promise<MutateCustomerAddressResult> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return { ok: false, message: "Konto nicht verifiziert oder deaktiviert." };

  const parsed = customerAddressUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Bitte Eingaben prüfen.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const prisma = getPrisma();
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId: verified },
  });
  if (!existing) return { ok: false, message: "Adresse nicht gefunden." };

  const kind = existing.kind as CustomerAddressKind;
  const makeDefault = parsed.data.isDefault;

  await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await clearDefaultForKind(tx, verified, kind, addressId);
    }
    await tx.customerAddress.update({
      where: { id: addressId },
      data: {
        label: parsed.data.label ?? null,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        company: parsed.data.company ?? null,
        line1: parsed.data.line1,
        line2: parsed.data.line2 ?? null,
        zip: parsed.data.zip,
        city: parsed.data.city,
        country: parsed.data.country,
        isDefault: makeDefault ? true : existing.isDefault,
      },
    });
  });

  log.info("customer_address_updated", { customerId: verified, addressId });
  return { ok: true, addressId };
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return { ok: false, message: "Konto nicht verifiziert oder deaktiviert." };

  const prisma = getPrisma();
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId: verified },
  });
  if (!existing) return { ok: false, message: "Adresse nicht gefunden." };

  await prisma.$transaction(async (tx) => {
    await tx.customerAddress.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await tx.customerAddress.findFirst({
        where: { customerId: verified, kind: existing.kind },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await tx.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });

  log.info("customer_address_deleted", { customerId: verified, addressId });
  return { ok: true };
}

export async function setDefaultCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return { ok: false, message: "Konto nicht verifiziert oder deaktiviert." };

  const prisma = getPrisma();
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, customerId: verified },
  });
  if (!existing) return { ok: false, message: "Adresse nicht gefunden." };

  const kind = existing.kind as CustomerAddressKind;
  await prisma.$transaction(async (tx) => {
    await clearDefaultForKind(tx, verified, kind, addressId);
    await tx.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  });

  return { ok: true };
}

export async function getCheckoutAddressPrefillForCustomer(
  customerId: string,
): Promise<CheckoutAddressPrefill | null> {
  const verified = await requireVerifiedCustomer(customerId);
  if (!verified) return null;

  const prisma = getPrisma();
  const customer = await prisma.customer.findUnique({
    where: { id: verified },
    select: { email: true },
  });
  if (!customer) return null;

  const [shipping, billing] = await Promise.all([
    prisma.customerAddress.findFirst({
      where: { customerId: verified, kind: "shipping", isDefault: true },
    }),
    prisma.customerAddress.findFirst({
      where: { customerId: verified, kind: "billing", isDefault: true },
    }),
  ]);

  if (!shipping) return null;

  const sameAsShipping =
    billing &&
    billing.firstName === shipping.firstName &&
    billing.lastName === shipping.lastName &&
    billing.line1 === shipping.line1 &&
    billing.zip === shipping.zip &&
    billing.city === shipping.city &&
    billing.country === shipping.country &&
    (billing.company ?? "") === (shipping.company ?? "") &&
    (billing.line2 ?? "") === (shipping.line2 ?? "");

  const prefill: CheckoutAddressPrefill = {
    email: customer.email,
    shippingFirstName: shipping.firstName,
    shippingLastName: shipping.lastName,
    shippingCompany: shipping.company ?? undefined,
    shippingLine1: shipping.line1,
    shippingLine2: shipping.line2 ?? undefined,
    shippingZip: shipping.zip,
    shippingCity: shipping.city,
    shippingCountry: shipping.country,
    billingUseShipping: !billing || sameAsShipping ? "yes" : "no",
  };

  if (billing && !sameAsShipping) {
    prefill.billingFirstName = billing.firstName;
    prefill.billingLastName = billing.lastName;
    prefill.billingCompany = billing.company ?? undefined;
    prefill.billingLine1 = billing.line1;
    prefill.billingLine2 = billing.line2 ?? undefined;
    prefill.billingZip = billing.zip;
    prefill.billingCity = billing.city;
    prefill.billingCountry = billing.country;
  }

  return prefill;
}
