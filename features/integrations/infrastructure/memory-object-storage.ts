import {
  ObjectStorageNotConfiguredError,
  type ObjectStorage,
  type PublicObjectPutInput,
  type PublicObjectPutResult,
} from "@/features/integrations/domain/object-storage";

/** In-Memory-Storage für Unit-Tests (kein Vercel-FS, kein Netzwerk). */
export function createMemoryObjectStorage(options?: {
  configured?: boolean;
}): ObjectStorage {
  const configured = options?.configured ?? true;
  const objects = new Map<string, { url: string; contentType: string; body: Buffer }>();

  return {
    isConfigured() {
      return configured;
    },

    async putPublic(input: PublicObjectPutInput): Promise<PublicObjectPutResult> {
      if (!configured) {
        throw new ObjectStorageNotConfiguredError();
      }
      const body =
        input.body instanceof Buffer
          ? input.body
          : Buffer.from(
              input.body instanceof ArrayBuffer
                ? input.body
                : await new Response(input.body as BodyInit).arrayBuffer(),
            );
      const url = `https://memory.blob.local/${input.pathname}`;
      objects.set(url, { url, contentType: input.contentType, body });
      return { url, pathname: input.pathname, contentType: input.contentType };
    },

    async deleteByUrl(url: string): Promise<void> {
      objects.delete(url);
    },
  };
}
