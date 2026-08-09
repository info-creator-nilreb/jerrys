export { normalizeCustomerEmail, isValidCustomerEmailShape } from "@/features/customers/domain/email";
export {
  CUSTOMER_PASSWORD_MIN_LENGTH,
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
  validateCustomerPassword,
} from "@/features/customers/domain/password";
export {
  CUSTOMER_AUTH_TOKEN_PURPOSES,
  CUSTOMER_AUTH_TOKEN_TTL_MS,
  CUSTOMER_IDENTITY_PROVIDERS,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
  customerAuthTokenExpiresAt,
  isCustomerAuthTokenUsable,
  type CustomerAuthTokenPurpose,
  type CustomerIdentityProvider,
} from "@/features/customers/domain/auth-token";
export {
  AUTH_SUBJECT_KINDS,
  isAuthSubjectKind,
  resolveAuthSubjectKind,
  type AuthSubjectKind,
} from "@/features/customers/domain/subject";

export {
  customerEmailSchema,
  customerPasswordSchema,
  customerRegisterSchema,
  customerPasswordLoginSchema,
  customerMagicLinkRequestSchema,
  customerPasswordResetRequestSchema,
  customerPasswordResetConfirmSchema,
  customerAuthTokenSchema,
} from "@/features/customers/application/customer-auth-schemas";

export { registerCustomer } from "@/features/customers/application/register-customer";
export { verifyCustomerEmail } from "@/features/customers/application/verify-customer-email";
export {
  authenticateCustomerPassword,
  markCustomerLoggedIn,
} from "@/features/customers/application/authenticate-customer-password";
export { requestCustomerMagicLink } from "@/features/customers/application/request-magic-link";
export { consumeCustomerMagicLink } from "@/features/customers/application/consume-magic-link";
export {
  requestCustomerPasswordReset,
  confirmCustomerPasswordReset,
} from "@/features/customers/application/password-reset";
export { getVerifiedActiveCustomerId } from "@/features/customers/application/get-verified-active-customer-id";
export {
  listOrdersForCustomer,
  getOrderForCustomer,
  type CustomerOrderListItem,
  type CustomerOrderDetail,
} from "@/features/customers/application/customer-orders";
