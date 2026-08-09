import { z } from "zod";
import { normalizeAddressText } from "@/lib/checkout/address-text";

const optionalName = z
  .string()
  .transform(normalizeAddressText)
  .pipe(z.string().max(80, "Bitte höchstens 80 Zeichen."))
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

/** Berichtigung nach Art. 16 DSGVO: Namen sind optional, dürfen aber nicht überlang sein. */
export const customerProfileUpdateSchema = z.object({
  firstName: optionalName,
  lastName: optionalName,
});
