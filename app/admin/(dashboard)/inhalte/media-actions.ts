"use server";

import { getAdminSession } from "@/lib/auth/admin-session";
import {
  listCmsMediaLibrary,
  type CmsMediaLibraryItem,
} from "@/lib/content/cms-media-library";
import { uploadCmsMediaAsset } from "@/lib/content/upload-cms-media";

export type CmsMediaUploadState = {
  ok?: boolean;
  error?: string;
  url?: string;
  id?: string;
} | null;

async function requireAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function listCmsMediaLibraryAction(): Promise<CmsMediaLibraryItem[]> {
  if (!(await requireAdmin())) return [];
  return listCmsMediaLibrary();
}

export async function uploadCmsMediaAction(
  _prev: CmsMediaUploadState,
  formData: FormData,
): Promise<CmsMediaUploadState> {
  if (!(await requireAdmin())) {
    return { error: "Nicht angemeldet." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Bilddatei wählen." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadCmsMediaAsset({
      bytes,
      declaredMime: file.type || null,
      fileName: file.name || null,
      alt: String(formData.get("alt") ?? "").trim() || null,
    });
    if (!result.ok) return { error: result.error };
    return { ok: true, url: result.url, id: result.id };
  } catch {
    return { error: "Upload fehlgeschlagen." };
  }
}
