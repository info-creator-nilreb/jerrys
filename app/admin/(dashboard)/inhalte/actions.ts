"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  publishContentPage,
  unpublishContentPage,
} from "@/lib/content/publish-content-page";
import { upsertContentPageFromInput } from "@/lib/content/update-content-page";

export type ContentPageFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
} | null;

export type ContentPageLifecycleState = {
  ok?: boolean;
  error?: string;
} | null;

async function requireAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function saveContentPageAction(
  _prev: ContentPageFormState,
  formData: FormData,
): Promise<ContentPageFormState> {
  if (!(await requireAdmin())) {
    return { error: "Nicht angemeldet." };
  }

  const idRaw = String(formData.get("id") ?? "").trim();
  const robotsRaw = formData.get("robotsIndex");
  const footerRaw = formData.get("showInFooter");
  const result = await upsertContentPageFromInput({
    id: idRaw || null,
    values: {
      slug: formData.get("slug"),
      pageType: formData.get("pageType"),
      status: formData.get("status") ?? "draft",
      title: formData.get("title"),
      seoTitle: formData.get("seoTitle"),
      seoDescription: formData.get("seoDescription"),
      ogImageUrl: formData.get("ogImageUrl"),
      canonicalPath: formData.get("canonicalPath"),
      robotsIndex: robotsRaw === "on" || robotsRaw === "true" || robotsRaw === "1",
      showInFooter: footerRaw === "on" || footerRaw === "true" || footerRaw === "1",
      previousSlug: formData.get("previousSlug"),
    },
    blocksJson: formData.get("blocksJson"),
  });

  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath("/admin/inhalte");
  revalidatePath(`/admin/inhalte/${result.page.id}/edit`);
  // Footer kann showInFooter nutzen.
  revalidatePath("/", "layout");

  if (!idRaw) {
    redirect(`/admin/inhalte/${result.page.id}/edit`);
  }

  return { ok: true };
}

export async function publishContentPageAction(
  pageId: string,
): Promise<ContentPageLifecycleState> {
  if (!(await requireAdmin())) {
    return { error: "Nicht angemeldet." };
  }
  const result = await publishContentPage(pageId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/inhalte");
  revalidatePath(`/admin/inhalte/${result.page.id}/edit`);
  return { ok: true };
}

export async function unpublishContentPageAction(
  pageId: string,
): Promise<ContentPageLifecycleState> {
  if (!(await requireAdmin())) {
    return { error: "Nicht angemeldet." };
  }
  const result = await unpublishContentPage(pageId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/inhalte");
  revalidatePath(`/admin/inhalte/${result.page.id}/edit`);
  return { ok: true };
}
