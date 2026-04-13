import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  deleteHomepageAmazonReview,
  deleteHomepageSocialImage,
  moveHomepageAmazonReview,
  moveHomepageSocialImage,
  setHomepageAmazonReviewActive,
  setHomepageSocialImageActive,
  submitHomepageSocialImageMetaForm,
} from "@/app/admin/(dashboard)/startseite/actions";
import { ReviewCreateForm } from "@/app/admin/(dashboard)/startseite/review-create-form";
import { ReviewEditForm } from "@/app/admin/(dashboard)/startseite/review-edit-form";
import { SocialUploadForm } from "@/app/admin/(dashboard)/startseite/social-upload-form";
import {
  listAllHomepageAmazonReviewsForAdmin,
  listAllHomepageSocialImagesForAdmin,
} from "@/lib/homepage/marketing-queries";

export const metadata: Metadata = {
  title: "Startseite",
};

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

export default async function AdminStartseitePage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { review: editingReviewId } = await searchParams;
  const [reviews, socialImages] = await Promise.all([
    listAllHomepageAmazonReviewsForAdmin(),
    listAllHomepageSocialImagesForAdmin(),
  ]);

  const editingReview = editingReviewId
    ? (reviews.find((r) => r.id === editingReviewId) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f2937]">Startseite</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Amazon-Zitate und Social-/Instagram-Bilder für die öffentliche Startseite pflegen. Änderungen
          sind nach dem Speichern sofort im Shop sichtbar (Cache-Revalidierung).
        </p>
      </div>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1f2937]">Amazon-Zitate (Slider)</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
          Kurze Auszüge manuell einpflegen; Sterne 1–5. Hinweis im Shop: Auszüge von Amazon, nicht live
          synchronisiert. Bei Zitaten aus fremden Rezensionen die jeweiligen Nutzungsbedingungen beachten.
        </p>

        {editingReview ? (
          <ReviewEditForm review={editingReview} />
        ) : (
          <ReviewCreateForm />
        )}

        {editingReviewId && !editingReview ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            Eintrag nicht gefunden.
          </p>
        ) : null}

        <div className="mt-8 border-t border-[#f0f1f3] pt-6">
          <p className="text-sm font-medium text-[#1f2937]">Alle Einträge ({reviews.length})</p>
          <ul className="mt-4 space-y-4">
            {reviews.map((r, idx) => (
              <li
                key={r.id}
                className="rounded-lg border border-[#e8eaed] bg-[#fafbfc] p-4 text-sm text-[#374151]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-amber-600" aria-hidden>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </p>
                    {r.headline ? <p className="mt-1 font-semibold text-[#1f2937]">{r.headline}</p> : null}
                    <p className="mt-2 whitespace-pre-wrap text-[#374151]">{r.quote}</p>
                    {r.author ? <p className="mt-2 text-xs text-[#6b7280]">— {r.author}</p> : null}
                    {r.sourceUrl ? (
                      <p className="mt-1 truncate text-xs">
                        <a href={r.sourceUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                          Quelle
                        </a>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-[#e5e7eb] text-[#6b7280]"
                      }`}
                    >
                      {r.isActive ? "Sichtbar" : "Ausgeblendet"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <form action={setHomepageAmazonReviewActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.isActive ? "false" : "true"} />
                        <button
                          type="submit"
                          className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs hover:bg-[#f9fafb]"
                        >
                          {r.isActive ? "Ausblenden" : "Einblenden"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/startseite?review=${encodeURIComponent(r.id)}`}
                        className="inline-flex items-center rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs hover:bg-[#f9fafb]"
                      >
                        Bearbeiten
                      </Link>
                      <form action={deleteHomepageAmazonReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Löschen
                        </button>
                      </form>
                    </div>
                    <div className="flex gap-1">
                      <form action={moveHomepageAmazonReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={idx === 0}
                          className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs disabled:opacity-40"
                          title="Nach oben"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveHomepageAmazonReview}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={idx === reviews.length - 1}
                          className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs disabled:opacity-40"
                          title="Nach unten"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {reviews.length === 0 ? (
            <p className="mt-4 text-sm text-[#9ca3af]">Noch keine Zitate. Oben ein neues anlegen.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1f2937]">Social-/Instagram-Bilder</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
          Bilder werden unter <code className="rounded bg-[#f3f4f6] px-1">/media/homepage-social/</code>{" "}
          gespeichert. Optional pro Bild einen Link (z. B. Instagram-Post) setzen.
        </p>

        <SocialUploadForm />

        <div className="mt-8 border-t border-[#f0f1f3] pt-6">
          <p className="text-sm font-medium text-[#1f2937]">Alle Bilder ({socialImages.length})</p>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {socialImages.map((img, idx) => (
              <li key={img.id} className="rounded-lg border border-[#e8eaed] p-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[#f3f4f6]">
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width:640px)100vw,320px"
                  />
                </div>
                <form action={submitHomepageSocialImageMetaForm} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={img.id} />
                  <label className="block text-xs font-medium text-[#6b7280]">Alt-Text</label>
                  <input name="alt" className={inputClass} defaultValue={img.alt} required />
                  <label className="block text-xs font-medium text-[#6b7280]">Link (optional)</label>
                  <input
                    name="href"
                    type="url"
                    className={inputClass}
                    defaultValue={img.href ?? ""}
                    placeholder="https://www.instagram.com/…"
                  />
                  <button
                    type="submit"
                    className="mt-1 rounded border border-[#d2d5d9] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#f9fafb]"
                  >
                    Metadaten speichern
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      img.isActive ? "bg-emerald-100 text-emerald-800" : "bg-[#e5e7eb] text-[#6b7280]"
                    }`}
                  >
                    {img.isActive ? "Sichtbar" : "Ausgeblendet"}
                  </span>
                  <form action={setHomepageSocialImageActive}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="active" value={img.isActive ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs hover:bg-[#f9fafb]"
                    >
                      {img.isActive ? "Ausblenden" : "Einblenden"}
                    </button>
                  </form>
                  <form action={deleteHomepageSocialImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <button
                      type="submit"
                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </form>
                  <form action={moveHomepageSocialImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={idx === 0}
                      className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveHomepageSocialImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={idx === socialImages.length - 1}
                      className="rounded border border-[#d2d5d9] bg-white px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          {socialImages.length === 0 ? (
            <p className="mt-4 text-sm text-[#9ca3af]">Noch keine Bilder.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
