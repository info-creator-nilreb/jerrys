/** Eindeutige Typen für Versand + Deduplizierung (@@unique orderId + emailType). */
export const EMAIL_ORDER_CONFIRMATION = "order_confirmation" as const;
export const EMAIL_ORDER_SHIPPED = "order_shipped" as const;
export const EMAIL_ORDER_CANCELLED = "order_cancelled" as const;
export const EMAIL_ORDER_REFUNDED = "order_refunded" as const;

export type EmailTypeId =
  | typeof EMAIL_ORDER_CONFIRMATION
  | typeof EMAIL_ORDER_SHIPPED
  | typeof EMAIL_ORDER_CANCELLED
  | typeof EMAIL_ORDER_REFUNDED;
