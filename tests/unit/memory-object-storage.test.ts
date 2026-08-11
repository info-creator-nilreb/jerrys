import { describe, expect, it } from "vitest";
import {
  createMemoryObjectStorage,
  ObjectStorageNotConfiguredError,
} from "@/features/integrations";

describe("createMemoryObjectStorage", () => {
  it("speichert und löscht öffentliche Objekte", async () => {
    const storage = createMemoryObjectStorage();
    expect(storage.isConfigured()).toBe(true);
    const put = await storage.putPublic({
      pathname: "branding/logo-light/test.png",
      body: Buffer.from([1, 2, 3]),
      contentType: "image/png",
    });
    expect(put.url).toContain("branding/logo-light/test.png");
    await storage.deleteByUrl(put.url);
  });

  it("wirft wenn nicht konfiguriert", async () => {
    const storage = createMemoryObjectStorage({ configured: false });
    expect(storage.isConfigured()).toBe(false);
    await expect(
      storage.putPublic({
        pathname: "x.png",
        body: Buffer.from("a"),
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(ObjectStorageNotConfiguredError);
  });
});
