/** Normalize customer emails for unique identity lookups. */
export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidCustomerEmailShape(email: string): boolean {
  // Practical shape check; Zod validates at boundaries.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeCustomerEmail(email));
}
