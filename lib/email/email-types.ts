/** Eindeutige Typen für Versand + Deduplizierung (@@unique orderId + emailType). */
export const EMAIL_ORDER_CONFIRMATION = "order_confirmation" as const;

export type EmailTypeId = typeof EMAIL_ORDER_CONFIRMATION;
