import "server-only";
import { del, put } from "@vercel/blob";
import {
  ObjectStorageNotConfiguredError,
  type ObjectStorage,
  type PublicObjectPutInput,
  type PublicObjectPutResult,
} from "@/features/integrations/domain/object-storage";

function readBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

export function createVercelBlobObjectStorage(): ObjectStorage {
  return {
    isConfigured() {
      return Boolean(readBlobToken());
    },

    async putPublic(input: PublicObjectPutInput): Promise<PublicObjectPutResult> {
      const token = readBlobToken();
      if (!token) {
        throw new ObjectStorageNotConfiguredError();
      }

      const result = await put(input.pathname, input.body, {
        access: "public",
        contentType: input.contentType,
        token,
        addRandomSuffix: false,
        allowOverwrite: input.allowOverwrite ?? false,
      });

      return {
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType ?? input.contentType,
      };
    },

    async deleteByUrl(url: string): Promise<void> {
      const token = readBlobToken();
      if (!token || !url.trim()) return;
      try {
        await del(url, { token });
      } catch {
        // Best-effort: fehlende oder fremde URLs nicht eskalieren.
      }
    },
  };
}
