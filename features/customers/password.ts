/**
 * Client-sichere Passwort-Hilfen (kein Prisma/Server).
 * Storefront-Komponenten importieren hier — nicht aus `@/features/customers`.
 */
export {
  CUSTOMER_PASSWORD_MIN_LENGTH,
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
  CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN,
  getCustomerPasswordCriteria,
  validateCustomerPassword,
  type CustomerPasswordCriterion,
  type CustomerPasswordCriterionId,
  type CustomerPasswordCriterionState,
  type PasswordValidationResult,
} from "@/features/customers/domain/password";
