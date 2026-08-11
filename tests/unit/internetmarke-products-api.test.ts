import { describe, expect, it } from "vitest";
import { fetchInternetmarkeCatalogProducts } from "@/features/fulfillment";

describe("fetchInternetmarkeCatalogProducts", () => {
  it("parst shortSalesProducts inkl. Cent-Preis", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          type: "PwsProducts",
          date: "11.08.26",
          shortSalesProducts: [
            {
              extProductid: "1",
              extProductname: "Standardbrief",
              transport: "national",
              grossprice: 0.95,
              maxWeight: 20,
            },
            {
              extProductid: 290,
              extProductname: "Warensendung",
              transport: "national",
              grossprice: 2.7,
              maxWeight: 1000,
            },
          ],
        }),
        { status: 200 },
      );

    const res = await fetchInternetmarkeCatalogProducts("api-key", fetchImpl);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.products).toEqual([
      {
        productCode: 1,
        name: "Standardbrief",
        priceCents: 95,
        transport: "national",
        maxWeightG: 20,
      },
      {
        productCode: 290,
        name: "Warensendung",
        priceCents: 270,
        transport: "national",
        maxWeightG: 1000,
      },
    ]);
  });

  it("meldet Fehler bei HTTP-Fehler", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 401 });
    const res = await fetchInternetmarkeCatalogProducts("k", fetchImpl);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(401);
  });
});
