import { describe, expect, it } from "vitest";
import {
  DEFAULT_PDP_TRUST_BAR_ITEMS,
  parsePdpReturnPolicyText,
  parsePdpTrustBarItems,
  pdpTrustBarItemsFromFormData,
} from "@/lib/shop/pdp-trust-settings";

describe("parsePdpTrustBarItems", () => {
  it("nutzt Defaults bei ungültigem JSON", () => {
    expect(parsePdpTrustBarItems(null)).toEqual(DEFAULT_PDP_TRUST_BAR_ITEMS);
    expect(parsePdpTrustBarItems([{ foo: "bar" }])).toEqual(DEFAULT_PDP_TRUST_BAR_ITEMS);
  });

  it("parst drei gültige Merkmale", () => {
    const items = parsePdpTrustBarItems([
      {
        enabled: true,
        icon: "truck",
        title: "Versand gratis",
        subtitle: null,
        appendFreeShippingThreshold: true,
      },
      {
        enabled: false,
        icon: "leaf",
        title: "Öko",
        subtitle: "Recycling",
        appendFreeShippingThreshold: false,
      },
      {
        enabled: true,
        icon: "headphones",
        title: "Hotline",
        subtitle: null,
        appendFreeShippingThreshold: false,
      },
    ]);
    expect(items[0]?.title).toBe("Versand gratis");
    expect(items[1]?.enabled).toBe(false);
    expect(items[1]?.subtitle).toBe("Recycling");
  });
});

describe("parsePdpReturnPolicyText", () => {
  it("normalisiert leere Werte zu null", () => {
    expect(parsePdpReturnPolicyText("")).toBeNull();
    expect(parsePdpReturnPolicyText("  ")).toBeNull();
    expect(parsePdpReturnPolicyText("30 Tage Rückgaberecht")).toBe("30 Tage Rückgaberecht");
  });
});

describe("pdpTrustBarItemsFromFormData", () => {
  it("liest drei Merkmale aus FormData", () => {
    const fd = new FormData();
    fd.set("pdpTrust0Enabled", "true");
    fd.set("pdpTrust0Icon", "truck");
    fd.set("pdpTrust0Title", "Kostenloser Versand");
    fd.set("pdpTrust0Subtitle", "");
    fd.append("pdpTrust0AppendFreeShipping", "false");
    fd.append("pdpTrust0AppendFreeShipping", "true");
    fd.set("pdpTrust1Enabled", "false");
    fd.set("pdpTrust1Icon", "leaf");
    fd.set("pdpTrust1Title", "Klimaneutral verpackt");
    fd.set("pdpTrust2Enabled", "true");
    fd.set("pdpTrust2Icon", "headphones");
    fd.set("pdpTrust2Title", "Support");
    const items = pdpTrustBarItemsFromFormData(fd);
    expect(items[0]?.appendFreeShippingThreshold).toBe(true);
    expect(items[1]?.enabled).toBe(false);
    expect(items[2]?.title).toBe("Support");
  });
});
