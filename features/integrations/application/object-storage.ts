import type { ObjectStorage } from "@/features/integrations/domain/object-storage";
import { createVercelBlobObjectStorage } from "@/features/integrations/infrastructure/vercel-blob-object-storage";

let testOverride: ObjectStorage | null = null;
let singleton: ObjectStorage | null = null;

/** Produktions-Adapter (Vercel Blob) bzw. Test-Override. */
export function getObjectStorage(): ObjectStorage {
  if (testOverride) return testOverride;
  if (!singleton) {
    singleton = createVercelBlobObjectStorage();
  }
  return singleton;
}

/** Nur für Unit-Tests. */
export function setObjectStorageForTests(storage: ObjectStorage | null): void {
  testOverride = storage;
}
