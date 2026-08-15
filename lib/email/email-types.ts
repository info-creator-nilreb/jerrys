/** Eindeutige Typen für Versand + Deduplizierung (@@unique orderId + emailType). */
export const EMAIL_ORDER_CONFIRMATION = "order_confirmation" as const;
export const EMAIL_ORDER_SHIPPED = "order_shipped" as const;
export const EMAIL_ORDER_PICKED_UP = "order_picked_up" as const;
export const EMAIL_ORDER_CANCELLED = "order_cancelled" as const;
export const EMAIL_ORDER_REFUNDED = "order_refunded" as const;
export const EMAIL_WORKSHOP_BOOKING_CONFIRMATION = "workshop_booking_confirmation" as const;
export const EMAIL_WORKSHOP_BOOKING_CANCELLED = "workshop_booking_cancelled" as const;

export type EmailTypeId =
  | typeof EMAIL_ORDER_CONFIRMATION
  | typeof EMAIL_ORDER_SHIPPED
  | typeof EMAIL_ORDER_PICKED_UP
  | typeof EMAIL_ORDER_CANCELLED
  | typeof EMAIL_ORDER_REFUNDED
  | typeof EMAIL_WORKSHOP_BOOKING_CONFIRMATION
  | typeof EMAIL_WORKSHOP_BOOKING_CANCELLED;
