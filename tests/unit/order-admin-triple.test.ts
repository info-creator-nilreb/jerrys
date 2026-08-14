import { describe, expect, it } from "vitest";
import {
  adminTripleOptionLabel,
  adminTripleOptions,
  deriveTripleFromOrder,
  pickNextStatusForDimension,
} from "@/lib/orders/order-admin-triple";

describe("order-admin-triple Abholung", () => {
  const processing = {
    status: "processing",
    payments: [{ status: "succeeded" }],
    statusHistory: [{ fromStatus: "paid", toStatus: "processing" }],
  };

  it("bietet Abgeholt als Lieferstatus an", () => {
    expect(adminTripleOptions("shipping")).toEqual(["offen", "versandt", "abgeholt", "retoure"]);
    expect(adminTripleOptionLabel("shipping", "abgeholt")).toBe("Abgeholt");
  });

  it("leitet processing → abgeholt auf Lieferstatus abgeholt", () => {
    expect(pickNextStatusForDimension(processing, "shipping", "abgeholt")).toBe("abgeholt");
    expect(pickNextStatusForDimension(processing, "shipping", "versandt")).toBe("shipped");
    expect(deriveTripleFromOrder({ ...processing, status: "abgeholt" })).toEqual({
      payment: "bezahlt",
      shipping: "abgeholt",
      order: "in_bearbeitung",
    });
  });

  it("behält nach Abschluss den Lieferstatus Abgeholt", () => {
    const completed = deriveTripleFromOrder({
      status: "completed",
      payments: [{ status: "succeeded" }],
      statusHistory: [
        { fromStatus: "processing", toStatus: "abgeholt" },
        { fromStatus: "abgeholt", toStatus: "completed" },
      ],
    });
    expect(completed.shipping).toBe("abgeholt");
    expect(completed.order).toBe("abgeschlossen");
  });

  it("behält nach Erstattung den Lieferstatus Abgeholt", () => {
    const refunded = deriveTripleFromOrder({
      status: "refunded",
      payments: [{ status: "refunded" }],
      statusHistory: [
        { fromStatus: "processing", toStatus: "abgeholt" },
        { fromStatus: "abgeholt", toStatus: "refunded" },
      ],
    });
    expect(refunded.shipping).toBe("abgeholt");
    expect(refunded.payment).toBe("erstattet");
  });
});
