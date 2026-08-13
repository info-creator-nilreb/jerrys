import { describe, expect, it } from "vitest";
import { defaultExpressShippingCountry } from "@/lib/checkout/express-shipping-quote";

describe("defaultExpressShippingCountry", () => {
  it("bevorzugt DE wenn erlaubt", () => {
    expect(defaultExpressShippingCountry(["AT", "DE", "CH"])).toBe("DE");
  });

  it("nimmt sonst das erste erlaubte Land", () => {
    expect(defaultExpressShippingCountry(["AT", "CH"])).toBe("AT");
  });
});
