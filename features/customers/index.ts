export { normalizeCustomerEmail, isValidCustomerEmailShape } from "@/features/customers/domain/email";
export {
  CUSTOMER_PASSWORD_MIN_LENGTH,
  CUSTOMER_PASSWORD_MAX_LENGTH,
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
  validateCustomerPassword,
  getCustomerPasswordCriteria,
  getCustomerPasswordStrength,
  CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN,
  CUSTOMER_PASSWORD_STRENGTH_SEGMENT_COUNT,
} from "@/features/customers/domain/password";
export {
  CUSTOMER_AUTH_TOKEN_PURPOSES,
  CUSTOMER_AUTH_TOKEN_TTL_MS,
  CUSTOMER_IDENTITY_PROVIDERS,
  generateCustomerAuthTokenSecret,
  hashCustomerAuthToken,
  customerAuthTokenExpiresAt,
  isCustomerAuthTokenUsable,
  normalizeCustomerAuthTokenFromClient,
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
  customerChangePasswordSchema,
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
export { changeCustomerPassword } from "@/features/customers/application/change-customer-password";
export { getVerifiedActiveCustomerId } from "@/features/customers/application/get-verified-active-customer-id";
export {
  listOrdersForCustomer,
  getOrderForCustomer,
  type CustomerOrderListItem,
  type CustomerOrderDetail,
} from "@/features/customers/application/customer-orders";
export { customerProfileUpdateSchema } from "@/features/customers/application/customer-privacy-schemas";
export {
  ORDER_EVENT_CUSTOMER_UNLINKED,
  CUSTOMER_DELETE_CONFIRMATION,
  exportCustomerData,
  updateCustomerProfile,
  anonymizeCustomerAccount,
  type CustomerDataExport,
  type UpdateCustomerProfileResult,
  type AnonymizeCustomerResult,
} from "@/features/customers/application/customer-privacy";
export {
  ORDER_EVENT_CUSTOMER_LINKED,
  listClaimableGuestOrders,
  countClaimableGuestOrders,
  claimGuestOrdersForCustomer,
  autoClaimGuestOrdersAfterVerification,
  type ClaimableGuestOrder,
  type ClaimGuestOrdersResult,
} from "@/features/customers/application/guest-order-claim";
export {
  CUSTOMER_ADDRESS_KINDS,
  customerAddressKindLabel,
  isCustomerAddressKind,
  type CustomerAddressKind,
} from "@/features/customers/domain/customer-address";
export {
  listCustomerAddresses,
  getCustomerAddressForCustomer,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getCheckoutAddressPrefillForCustomer,
  type CustomerAddressListItem,
  type CustomerAddressDetail,
  type CheckoutAddressPrefill,
  type MutateCustomerAddressResult,
} from "@/features/customers/application/customer-addresses";
