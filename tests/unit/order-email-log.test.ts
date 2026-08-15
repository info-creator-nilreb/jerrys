import { describe, expect, it, vi } from "vitest";
import {
  claimOrderEmailSend,
  isOrderEmailAlreadySentSuccessfully,
  shouldSkipOrderEmailSend,
} from "@/lib/email/order-email-log";

describe("order-email-log (Epic 5 Dedupe)", () => {
  it("überspringt nur bei erfolgreichem Versand", () => {
    expect(isOrderEmailAlreadySentSuccessfully({ status: "sent" })).toBe(true);
    expect(isOrderEmailAlreadySentSuccessfully({ status: "failed" })).toBe(false);
    expect(isOrderEmailAlreadySentSuccessfully({ status: "skipped_no_provider" })).toBe(false);
    expect(isOrderEmailAlreadySentSuccessfully({ status: "pending" })).toBe(false);
    expect(isOrderEmailAlreadySentSuccessfully(null)).toBe(false);
  });

  it("überspringt parallele Sender bei sent und pending", () => {
    expect(shouldSkipOrderEmailSend({ status: "sent" })).toBe(true);
    expect(shouldSkipOrderEmailSend({ status: "pending" })).toBe(true);
    expect(shouldSkipOrderEmailSend({ status: "failed" })).toBe(false);
    expect(shouldSkipOrderEmailSend(null)).toBe(false);
  });
});

describe("claimOrderEmailSend", () => {
  it("legt einen pending-Claim an", async () => {
    const create = vi.fn().mockResolvedValue({ id: "log-1" });
    const prisma = { emailLog: { create, findUnique: vi.fn(), updateMany: vi.fn() } };

    await expect(
      claimOrderEmailSend(prisma as never, {
        orderId: "o1",
        emailType: "order_confirmation",
        toEmail: "a@example.com",
      }),
    ).resolves.toBe("claimed");
    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "o1",
        emailType: "order_confirmation",
        toEmail: "a@example.com",
        status: "pending",
      },
    });
  });

  it("überspringt wenn bereits sent (Unique-Konflikt)", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const findUnique = vi.fn().mockResolvedValue({ status: "sent" });
    const prisma = { emailLog: { create, findUnique, updateMany: vi.fn() } };

    await expect(
      claimOrderEmailSend(prisma as never, {
        orderId: "o1",
        emailType: "order_confirmation",
        toEmail: "a@example.com",
      }),
    ).resolves.toBe("already_claimed");
    expect(findUnique).toHaveBeenCalled();
  });

  it("überspringt parallelen pending-Claim", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const findUnique = vi.fn().mockResolvedValue({ status: "pending" });
    const updateMany = vi.fn();
    const prisma = { emailLog: { create, findUnique, updateMany } };

    await expect(
      claimOrderEmailSend(prisma as never, {
        orderId: "o1",
        emailType: "order_confirmation",
        toEmail: "a@example.com",
      }),
    ).resolves.toBe("already_claimed");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("holt fehlgeschlagene Logs für einen erneuten Versuch zurück", async () => {
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const findUnique = vi.fn().mockResolvedValue({ status: "failed" });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = { emailLog: { create, findUnique, updateMany } };

    await expect(
      claimOrderEmailSend(prisma as never, {
        orderId: "o1",
        emailType: "order_confirmation",
        toEmail: "a@example.com",
      }),
    ).resolves.toBe("claimed");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderId: "o1",
          emailType: "order_confirmation",
        }),
        data: expect.objectContaining({ status: "pending" }),
      }),
    );
  });
});
