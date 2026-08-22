/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { CONSENT_UPDATED_EVENT } from "@/lib/consent/constants";
import { buildConsentRecord, writeConsentToWindow } from "@/lib/consent/storage";

describe("writeConsentToWindow", () => {
  it("feuert CONSENT_UPDATED_EVENT nach Speichern", () => {
    const handler = vi.fn();
    window.addEventListener(CONSENT_UPDATED_EVENT, handler);
    try {
      writeConsentToWindow(buildConsentRecord({ statistics: true, marketing: false }));
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(CONSENT_UPDATED_EVENT, handler);
    }
  });
});
