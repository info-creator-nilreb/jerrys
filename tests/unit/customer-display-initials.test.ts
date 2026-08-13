import { describe, expect, it } from "vitest";
import { customerDisplayInitials } from "@/lib/storefront/customer-display-initials";

describe("customerDisplayInitials", () => {
  it("nimmt Vor- und Nachname", () => {
    expect(customerDisplayInitials("Ada Lovelace", "ada@example.com")).toBe("AL");
  });

  it("fällt auf E-Mail zurück", () => {
    expect(customerDisplayInitials(null, "katze@jerry-s.com")).toBe("KA");
  });

  it("liefert Fallback ohne Daten", () => {
    expect(customerDisplayInitials(null, null)).toBe("?");
  });
});
