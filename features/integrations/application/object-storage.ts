import type { ObjectStorage } from "@/features/integrations/domain/object-storage";

let testOverride: ObjectStorage | null = null;
let singleton: ObjectStorage | null = null;

/** Produktions-Adapter (Vercel Blob) bzw. Test-Override — Adapter wird lazy geladen. */
export function getObjectStorage(): ObjectStorage {
  if (testOverride) return testOverride;
  if (!singleton) {
    // Lazy: `@vercel/blob` / server-only nicht beim Import von Outbox-Helfern laden.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createVercelBlobObjectStorage } =
      require("@/features/integrations/infrastructure/vercel-blob-object-storage") as typeof import("@/features/integrations/infrastructure/vercel-blob-object-storage");
    singleton = createVercelBlobObjectStorage();
  }
  return singleton;
}

/** Nur für Unit-Tests. */
export function setObjectStorageForTests(storage: ObjectStorage | null): void {
  testOverride = storage;
}
