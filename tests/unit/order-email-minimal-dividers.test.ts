import { describe, expect, it } from "vitest";
import { buildOrderItemsTableHtml } from "@/lib/email/transactional-email-layout";
import { orderItemsHtml, orderTotalsHtml } from "@/lib/email/templates/order-fragments";

describe("order email minimal dividers", () => {
  it("setzt bei Positionen nur zwischen Zeilen eine dezente Trennlinie", () => {
    const html = orderItemsHtml([
      {
        productTitleSnapshot: "Gin Tasting Set",
        quantity: 1,
        lineTotalGrossCents: 4990,
        currency: "EUR",
      },
      {
        productTitleSnapshot: "Gin Mini",
        quantity: 2,
        lineTotalGrossCents: 1990,
        currency: "EUR",
      },
    ]);

    expect(html).toContain("border-bottom:1px solid #eeeeee");
    expect(html.match(/border-bottom:1px solid #eeeeee/g)?.length).toBe(3);
    expect(html).not.toContain("#cfe9b0");
  });

  it("nutzt für Summen nur eine einzelne Top-Linie ohne grüne Akzentfarbe", () => {
    const html = orderTotalsHtml({
      subtotal: "49,90 €",
      shipping: "4,90 €",
      total: "54,80 €",
      paymentMethod: "PayPal",
    });

    expect(html).toContain("border-top:1px solid #eeeeee");
    expect(html).not.toContain("border-top:2px");
    expect(html).not.toContain("border-bottom:1px");
    expect(html).not.toContain("#cfe9b0");
    expect(html).toContain("Zahlungsart: PayPal");
  });

  it("buildOrderItemsTableHtml lässt die letzte Position ohne Unterlinie", () => {
    const html = buildOrderItemsTableHtml(
      [
        {
          productTitleSnapshot: "A",
          quantity: 1,
          lineTotalGrossCents: 100,
          currency: "EUR",
        },
        {
          productTitleSnapshot: "B",
          quantity: 1,
          lineTotalGrossCents: 200,
          currency: "EUR",
        },
      ],
      (cents, currency) => `${cents} ${currency}`,
    );

    expect((html.match(/border-bottom:1px solid #eeeeee/g) ?? []).length).toBe(3);

    const single = buildOrderItemsTableHtml(
      [
        {
          productTitleSnapshot: "Einzeln",
          quantity: 1,
          lineTotalGrossCents: 100,
          currency: "EUR",
        },
      ],
      (cents, currency) => `${cents} ${currency}`,
    );
    expect(single).not.toContain("border-bottom");
  });
});
