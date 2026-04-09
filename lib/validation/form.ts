import { z } from "zod";

/** Trim strings and treat empty as invalid for required fields. */
export const nonEmptyString = z.string().trim().min(1);

export const emailSchema = z.string().trim().email();

export function parseFormData<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
