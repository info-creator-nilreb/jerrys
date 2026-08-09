import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

/** Datenauskunft ist teuer (viele Joins) und wird selten gebraucht. */
const exportLimiter = createSlidingWindowIpRateLimiter(60 * 60 * 1000, 10);

export function touchCustomerDataExportAttempt(clientKey: string) {
  return exportLimiter.touch(clientKey);
}

export function __resetCustomerPrivacyRateLimitForTests(): void {
  exportLimiter.resetForTests();
}
