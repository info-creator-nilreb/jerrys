"use server";

import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { ALLOWED_IMAGE_TYPES, extFromMime, MAX_UPLOAD_BYTES } from "@/lib/admin/upload-image";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("admin.startseite");

export type StartseiteFormState = { error?: string; ok?: boolean } | null;

async function requireAdminOrRedirect(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

function parseOptionalUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

const reviewFieldsSchema = z.object({
  quote: z.string().trim().min(1, "Zitat erforderlich.").max(4000),
  rating: z.coerce.number().int().min(1, "1–5 Sterne.").max(5, "1–5 Sterne."),
  headline: z
    .string()
    .trim()
    .max(200)
    .transform((s) => (s === "" ? undefined : s)),
  author: z
    .string()
    .trim()
    .max(200)
    .transform((s) => (s === "" ? undefined : s)),
  sourceUrlRaw: z
    .string()
    .trim()
    .max(2000)
    .transform((s) => (s === "" ? undefined : s)),
});

export async function createHomepageAmazonReview(
  _prev: StartseiteFormState | undefined,
  formData: FormData,
): Promise<StartseiteFormState> {
  await requireAdminOrRedirect();

  const parsed = reviewFieldsSchema.safeParse({
    quote: formData.get("quote"),
    rating: formData.get("rating"),
    headline: String(formData.get("headline") ?? ""),
    author: String(formData.get("author") ?? ""),
    sourceUrlRaw: String(formData.get("sourceUrl") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingaben prüfen." };
  }
  const d = parsed.data;
  const sourceUrl = d.sourceUrlRaw ? parseOptionalUrl(d.sourceUrlRaw) : undefined;
  if (d.sourceUrlRaw && !sourceUrl) {
    return { error: "Quellen-URL ungültig (nur http/https)." };
  }

  const maxSort = await getPrisma().homepageAmazonReview.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 10;

  try {
    await getPrisma().homepageAmazonReview.create({
      data: {
        quote: d.quote,
        rating: d.rating,
        headline: d.headline,
        author: d.author,
        sourceUrl,
        sortOrder,
        isActive: true,
      },
    });
  } catch (e) {
    log.error("homepage_review_create_failed", { ...errorMeta(e) });
    return { error: "Speichern fehlgeschlagen." };
  }

  revalidatePath("/");
  revalidatePath("/admin/startseite");
  return { ok: true };
}

export async function updateHomepageAmazonReview(
  _prev: StartseiteFormState | undefined,
  formData: FormData,
): Promise<StartseiteFormState> {
  await requireAdminOrRedirect();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID fehlt." };

  const parsed = reviewFieldsSchema.safeParse({
    quote: formData.get("quote"),
    rating: formData.get("rating"),
    headline: String(formData.get("headline") ?? ""),
    author: String(formData.get("author") ?? ""),
    sourceUrlRaw: String(formData.get("sourceUrl") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingaben prüfen." };
  }
  const d = parsed.data;
  const sourceUrl = d.sourceUrlRaw ? parseOptionalUrl(d.sourceUrlRaw) : undefined;
  if (d.sourceUrlRaw && !sourceUrl) {
    return { error: "Quellen-URL ungültig (nur http/https)." };
  }

  try {
    await getPrisma().homepageAmazonReview.update({
      where: { id },
      data: {
        quote: d.quote,
        rating: d.rating,
        headline: d.headline,
        author: d.author,
        sourceUrl,
      },
    });
  } catch (e) {
    log.error("homepage_review_update_failed", { id, ...errorMeta(e) });
    return { error: "Aktualisieren fehlgeschlagen." };
  }

  revalidatePath("/");
  revalidatePath("/admin/startseite");
  return { ok: true };
}

/** Für `<form action={…}>` ohne `useActionState` (ein Argument). */
export async function submitHomepageSocialImageMetaForm(formData: FormData): Promise<void> {
  await updateHomepageSocialImageMeta(undefined, formData);
}

export async function deleteHomepageAmazonReview(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await getPrisma().homepageAmazonReview.delete({ where: { id } });
  } catch (e) {
    log.error("homepage_review_delete_failed", { id, ...errorMeta(e) });
  }
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}

export async function setHomepageAmazonReviewActive(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  await getPrisma().homepageAmazonReview.update({
    where: { id },
    data: { isActive: active },
  });
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}

export async function moveHomepageAmazonReview(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  const dir = String(formData.get("direction") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const prisma = getPrisma();
  const rows = await prisma.homepageAmazonReview.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx]!;
  const b = rows[swapIdx]!;
  await prisma.$transaction([
    prisma.homepageAmazonReview.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.homepageAmazonReview.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}

const HOMEPAGE_SOCIAL_PREFIX = "/media/homepage-social/";

function localPathFromPublicUrl(url: string): string | null {
  if (!url.startsWith(HOMEPAGE_SOCIAL_PREFIX)) return null;
  const rel = url.slice(HOMEPAGE_SOCIAL_PREFIX.length);
  if (!rel || rel.includes("..") || rel.includes("/")) return null;
  return path.join(process.cwd(), "public", "media", "homepage-social", rel);
}

export async function uploadHomepageSocialImages(
  _prev: StartseiteFormState | undefined,
  formData: FormData,
): Promise<StartseiteFormState> {
  await requireAdminOrRedirect();

  const altBase = String(formData.get("altBase") ?? "").trim();
  if (!altBase) {
    return { error: "Alt-Text (Basis) erforderlich." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Mindestens eine Datei auswählen." };
  }

  const dir = path.join(process.cwd(), "public", "media", "homepage-social");
  await mkdir(dir, { recursive: true });

  const maxSort = await getPrisma().homepageSocialImage.aggregate({
    _max: { sortOrder: true },
  });
  let nextOrder = (maxSort._max.sortOrder ?? -1) + 1;

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (file.size > MAX_UPLOAD_BYTES) {
        return { error: `Datei zu groß (max. ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` };
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return { error: "Nur JPEG-, PNG- oder WebP-Bilder erlaubt." };
      }
      const ext = extFromMime(file.type);
      if (!ext) {
        return { error: "Ungültiger Bildtyp." };
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const filename = `${randomUUID()}.${ext}`;
      const fullPath = path.join(dir, filename);
      await writeFile(fullPath, buf);

      const publicUrl = `${HOMEPAGE_SOCIAL_PREFIX}${filename}`;
      const alt = files.length > 1 ? `${altBase} (${i + 1}/${files.length})` : altBase;

      await getPrisma().homepageSocialImage.create({
        data: {
          url: publicUrl,
          alt,
          href: undefined,
          sortOrder: nextOrder,
          isActive: true,
        },
      });
      nextOrder += 1;
    }
  } catch (e) {
    log.error("homepage_social_upload_failed", { ...errorMeta(e) });
    return { error: "Upload fehlgeschlagen." };
  }

  revalidatePath("/");
  revalidatePath("/admin/startseite");
  return { ok: true };
}

export async function updateHomepageSocialImageMeta(
  _prev: StartseiteFormState | undefined,
  formData: FormData,
): Promise<StartseiteFormState> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID fehlt." };

  const alt = String(formData.get("alt") ?? "").trim();
  if (!alt) return { error: "Alt-Text erforderlich." };

  const hrefRaw = String(formData.get("href") ?? "").trim();
  const href = hrefRaw ? parseOptionalUrl(hrefRaw) : undefined;
  if (hrefRaw && !href) return { error: "Link-URL ungültig." };

  try {
    await getPrisma().homepageSocialImage.update({
      where: { id },
      data: { alt, href: href ?? null },
    });
  } catch (e) {
    log.error("homepage_social_meta_failed", { id, ...errorMeta(e) });
    return { error: "Speichern fehlgeschlagen." };
  }

  revalidatePath("/");
  revalidatePath("/admin/startseite");
  return { ok: true };
}

export async function deleteHomepageSocialImage(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const row = await getPrisma().homepageSocialImage.findUnique({
    where: { id },
    select: { url: true },
  });
  if (!row) return;

  const local = localPathFromPublicUrl(row.url);
  if (local && existsSync(local)) {
    try {
      await unlink(local);
    } catch (e) {
      log.warn("homepage_social_file_delete_failed", { local, ...errorMeta(e) });
    }
  }

  try {
    await getPrisma().homepageSocialImage.delete({ where: { id } });
  } catch (e) {
    log.error("homepage_social_delete_failed", { id, ...errorMeta(e) });
  }
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}

export async function setHomepageSocialImageActive(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) return;
  await getPrisma().homepageSocialImage.update({
    where: { id },
    data: { isActive: active },
  });
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}

export async function moveHomepageSocialImage(formData: FormData): Promise<void> {
  await requireAdminOrRedirect();
  const id = String(formData.get("id") ?? "").trim();
  const dir = String(formData.get("direction") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const prisma = getPrisma();
  const rows = await prisma.homepageSocialImage.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx]!;
  const b = rows[swapIdx]!;
  await prisma.$transaction([
    prisma.homepageSocialImage.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.homepageSocialImage.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/startseite");
}
