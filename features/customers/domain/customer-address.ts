export const CUSTOMER_ADDRESS_KINDS = ["shipping", "billing"] as const;

export type CustomerAddressKind = (typeof CUSTOMER_ADDRESS_KINDS)[number];

export function isCustomerAddressKind(value: string): value is CustomerAddressKind {
  return (CUSTOMER_ADDRESS_KINDS as readonly string[]).includes(value);
}

export function customerAddressKindLabel(kind: CustomerAddressKind): string {
  return kind === "shipping" ? "Lieferadresse" : "Rechnungsadresse";
}
