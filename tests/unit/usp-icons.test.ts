import { describe, expect, it } from "vitest";
import { iconForUspText, pickDistinctUspIcon } from "@/lib/catalog/usp-icons";

describe("usp-icons", () => {
  it("mappt Stichworte ohne KI", () => {
    expect(iconForUspText("Pflegeleicht abwischbar")).toBe("leaf");
    expect(iconForUspText("Stabil & langlebig", "pet")).toBe("paw");
    expect(iconForUspText("Sicher & geborgen", "pet")).toBe("paw");
  });

  it("vermeidet doppelte Icons in einer Zeile", () => {
    const used = new Set<"paw" | "leaf" | "heart" | "shield" | "sparkles" | "gem" | "flag-de" | "tag">();
    const a = pickDistinctUspIcon("Stabil & langlebig", "pet", used);
    used.add(a);
    const b = pickDistinctUspIcon("Auch sehr stabil", "pet", used);
    expect(b).not.toBe(a);
  });
});
