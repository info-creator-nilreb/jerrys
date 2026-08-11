import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_PREVIEW_TTL_SECONDS,
  contentPreviewPath,
  createContentPreviewToken,
  verifyContentPreviewToken,
} from "@/lib/content/preview-token";

describe("content preview token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("erzeugt und verifiziert ein gültiges Token", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long!!");
    const now = new Date("2026-08-11T12:00:00.000Z");
    const created = createContentPreviewToken("page_abc", { now });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const verified = verifyContentPreviewToken(created.token, {
      now,
      expectedPageId: "page_abc",
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.pageId).toBe("page_abc");
    expect(verified.expiresAt.getTime()).toBe(
      now.getTime() + CONTENT_PREVIEW_TTL_SECONDS * 1000,
    );
  });

  it("lehnt abgelaufene und manipulierte Tokens ab", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long!!");
    const now = new Date("2026-08-11T12:00:00.000Z");
    const created = createContentPreviewToken("page_abc", {
      now,
      ttlSeconds: 60,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const expired = verifyContentPreviewToken(created.token, {
      now: new Date(now.getTime() + 120_000),
    });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe("expired");

    const tampered = `${created.token.slice(0, -2)}xx`;
    const badSig = verifyContentPreviewToken(tampered, { now });
    expect(badSig.ok).toBe(false);

    const wrongPage = verifyContentPreviewToken(created.token, {
      now,
      expectedPageId: "other",
    });
    expect(wrongPage.ok).toBe(false);
  });

  it("baut Preview-Pfad mit Token-Query", () => {
    expect(contentPreviewPath("id1", "tok")).toBe(
      "/vorschau/inhalte/id1?token=tok",
    );
  });

  it("nutzt CONTENT_PREVIEW_SECRET wenn gesetzt", () => {
    vi.stubEnv("AUTH_SECRET", "auth-secret-xxxxxxxxxxxxxxxxxxxx");
    vi.stubEnv("CONTENT_PREVIEW_SECRET", "preview-secret-xxxxxxxxxxxxxxxxx");
    const created = createContentPreviewToken("p1");
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    vi.stubEnv("CONTENT_PREVIEW_SECRET", "other-preview-secret-xxxxxxxxxxxx");
    const verified = verifyContentPreviewToken(created.token);
    expect(verified.ok).toBe(false);
  });
});
