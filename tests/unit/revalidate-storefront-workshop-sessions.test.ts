import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath,
}));

describe("revalidateStorefrontWorkshopSessions", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it("invalidiert Termin-Storefront und Startseite", async () => {
    const { revalidateStorefrontWorkshopSessions } = await import(
      "@/lib/workshop/revalidate-storefront-workshop-sessions"
    );
    revalidateStorefrontWorkshopSessions();
    expect(revalidatePath).toHaveBeenCalledWith("/termine");
    expect(revalidatePath).toHaveBeenCalledWith("/termine/wunschtermin");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/produkte", "layout");
  });
});
