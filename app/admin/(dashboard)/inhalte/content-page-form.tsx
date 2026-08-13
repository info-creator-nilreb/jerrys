"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useMemo, useState } from "react";
import { ContentBlockFields } from "@/app/admin/(dashboard)/inhalte/content-block-fields";
import {
  saveContentPageAction,
  type ContentPageFormState,
} from "@/app/admin/(dashboard)/inhalte/actions";
import { CmsMediaField } from "@/components/admin/cms-media-field";
import {
  ContentLivePreview,
  type LivePreviewProduct,
} from "@/components/content/live-preview/content-live-preview";
import { defaultDataForContentBlockType } from "@/lib/content/block-defaults";
import {
  CONTENT_BLOCK_TYPE_LABELS,
  CONTENT_PAGE_STATUS_LABELS,
  CONTENT_PAGE_TYPE_LABELS,
} from "@/lib/content/block-type-labels";
import {
  CONTENT_BLOCK_TYPES,
  isContentBlockType,
  type ContentBlockType,
} from "@/lib/content/block-types";
import { CONTENT_PAGE_HOME_SLUG } from "@/lib/content/reserved-slugs";

type EditorBlock = {
  clientId: string;
  id?: string;
  type: ContentBlockType;
  data: Record<string, unknown>;
  open: boolean;
};

type InitialPage = {
  id: string;
  slug: string;
  pageType: "homepage" | "content" | "legal";
  status: "draft" | "published";
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalPath: string;
  robotsIndex: boolean;
  showInFooter: boolean;
  previousSlug: string;
  blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>;
};

const fieldClass =
  "mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2.5 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

function newClientId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

export function ContentPageForm({
  initial,
  previewProducts = [],
  aiReady = false,
}: {
  initial?: InitialPage;
  previewProducts?: LivePreviewProduct[];
  aiReady?: boolean;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState<
    ContentPageFormState,
    FormData
  >(saveContentPageAction, null);

  const [pageType, setPageType] = useState(initial?.pageType ?? "content");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(initial?.ogImageUrl ?? "");
  const [slug, setSlug] = useState(
    initial?.slug ?? (pageType === "homepage" ? CONTENT_PAGE_HOME_SLUG : ""),
  );
  const [addType, setAddType] = useState<ContentBlockType>("hero");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    (initial?.blocks ?? []).map((b) => ({
      clientId: b.id,
      id: b.id,
      type: isContentBlockType(b.type) ? b.type : "richText",
      data: b.data,
      open: false,
    })),
  );

  const blocksJson = useMemo(
    () =>
      JSON.stringify(
        blocks.map((b) => ({
          id: b.id ?? null,
          type: b.type,
          data: b.data,
        })),
      ),
    [blocks],
  );

  const previewBlocks = useMemo(
    () =>
      blocks.map((b) => ({
        clientId: b.clientId,
        type: b.type,
        data: b.data,
      })),
    [blocks],
  );

  const fe = state?.fieldErrors ?? {};

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  function addBlock() {
    setBlocks((prev) => [
      ...prev,
      {
        clientId: newClientId(),
        type: addType,
        data: defaultDataForContentBlockType(addType),
        open: true,
      },
    ]);
  }

  const editor = (
    <form id={formId} action={formAction} className="space-y-8">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="blocksJson" value={blocksJson} />
      {pageType === "homepage" ? (
        <input type="hidden" name="slug" value={CONTENT_PAGE_HOME_SLUG} />
      ) : null}

      <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#1f2937]">Seite</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Titel <span className="text-primary">*</span>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
            {fe.title ? <p className="mt-1 text-sm text-red-600">{fe.title}</p> : null}
          </label>
          <label className="text-sm text-[#5c5f66]">
            Typ
            <select
              name="pageType"
              className={fieldClass}
              value={pageType}
              onChange={(e) => {
                const t = e.target.value as typeof pageType;
                setPageType(t);
                if (t === "homepage") setSlug(CONTENT_PAGE_HOME_SLUG);
              }}
            >
              {(Object.keys(CONTENT_PAGE_TYPE_LABELS) as Array<
                keyof typeof CONTENT_PAGE_TYPE_LABELS
              >).map((k) => (
                <option key={k} value={k}>
                  {CONTENT_PAGE_TYPE_LABELS[k]}
                </option>
              ))}
            </select>
            {fe.pageType ? <p className="mt-1 text-sm text-red-600">{fe.pageType}</p> : null}
          </label>
          <label className="text-sm text-[#5c5f66]">
            Status beim Speichern
            <select
              name="status"
              className={fieldClass}
              defaultValue={initial?.status ?? "draft"}
            >
              {(Object.keys(CONTENT_PAGE_STATUS_LABELS) as Array<
                keyof typeof CONTENT_PAGE_STATUS_LABELS
              >).map((k) => (
                <option key={k} value={k}>
                  {CONTENT_PAGE_STATUS_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            Slug <span className="text-primary">*</span>
            <input
              name={pageType === "homepage" ? undefined : "slug"}
              required={pageType !== "homepage"}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={pageType === "homepage"}
              className={fieldClass}
            />
            {pageType === "homepage" ? (
              <p className="mt-1 text-xs text-[#9ca3af]">
                Startseite nutzt fest den Slug „{CONTENT_PAGE_HOME_SLUG}“ (öffentlich /).
              </p>
            ) : null}
            {fe.slug ? <p className="mt-1 text-sm text-red-600">{fe.slug}</p> : null}
          </label>
          <label className="text-sm text-[#5c5f66]">
            SEO-Titel
            <input
              name="seoTitle"
              defaultValue={initial?.seoTitle ?? ""}
              className={fieldClass}
            />
          </label>
          <label className="text-sm text-[#5c5f66]">
            Canonical-Pfad
            <input
              name="canonicalPath"
              defaultValue={initial?.canonicalPath ?? ""}
              className={fieldClass}
              placeholder="/impressum"
            />
          </label>
          <label className="text-sm text-[#5c5f66] sm:col-span-2">
            SEO-Description
            <textarea
              name="seoDescription"
              defaultValue={initial?.seoDescription ?? ""}
              className={`${fieldClass} min-h-20`}
            />
          </label>
          <CmsMediaField
            label="OG-Bild"
            name="ogImageUrl"
            value={ogImageUrl}
            onChange={setOgImageUrl}
            hint="Upload, Medienbibliothek oder URL (Social Sharing)"
          />
          <input type="hidden" name="previousSlug" value={initial?.previousSlug ?? ""} />
          <label className="flex items-center gap-2 text-sm text-[#2d2e32] sm:col-span-2">
            <input
              type="checkbox"
              name="robotsIndex"
              value="true"
              defaultChecked={initial?.robotsIndex ?? true}
              className="size-4 checkbox-primary"
            />
            Für Suchmaschinen indexierbar (nach Veröffentlichung)
          </label>
          {pageType === "content" ? (
            <label className="flex items-start gap-2 text-sm text-[#2d2e32] sm:col-span-2">
              <input
                type="checkbox"
                name="showInFooter"
                value="true"
                defaultChecked={initial?.showInFooter ?? false}
                className="mt-0.5 size-4 checkbox-primary"
              />
              <span>
                Im Storefront-Footer anzeigen
                <span className="mt-0.5 block text-xs text-[#6b7280]">
                  Nur veröffentlichte Inhaltsseiten. Zusätzlich muss unter Einstellungen die
                  Footer-Sektion „CMS-Seiten“ aktiv sein.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#1f2937]">Blöcke</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-h-11 rounded-md border border-[#e3e4e8] px-3 text-sm"
              value={addType}
              onChange={(e) => setAddType(e.target.value as ContentBlockType)}
              aria-label="Block-Typ"
            >
              {CONTENT_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_BLOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addBlock}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[#e3e4e8] px-3 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              <Plus className="size-4" aria-hidden strokeWidth={1.75} />
              Hinzufügen
            </button>
          </div>
        </div>
        {fe.blocks ? <p className="mt-2 text-sm text-red-600">{fe.blocks}</p> : null}

        {blocks.length === 0 ? (
          <p className="mt-6 text-sm text-[#6b7280]">Noch keine Blöcke.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {blocks.map((block, index) => (
              <li
                key={block.clientId}
                className="rounded-lg border border-[#e8eaed] bg-[#fafafa]"
              >
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-md border border-[#e3e4e8] bg-white px-2 text-[#374151]"
                    aria-label="Nach oben"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    <ChevronUp className="mx-auto size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="min-h-11 min-w-11 rounded-md border border-[#e3e4e8] bg-white px-2 text-[#374151]"
                    aria-label="Nach unten"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    <ChevronDown className="mx-auto size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="min-h-11 flex-1 rounded-md px-2 text-left text-sm font-medium text-[#1f2937] hover:bg-white/80"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.map((b) =>
                          b.clientId === block.clientId ? { ...b, open: !b.open } : b,
                        ),
                      )
                    }
                  >
                    {index + 1}. {CONTENT_BLOCK_TYPE_LABELS[block.type]}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                    aria-label="Block entfernen"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.filter((b) => b.clientId !== block.clientId),
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden strokeWidth={1.75} />
                  </button>
                </div>
                {block.open ? (
                  <div className="border-t border-[#e8eaed] bg-white p-4">
                    <ContentBlockFields
                      type={block.type}
                      data={block.data}
                      aiReady={aiReady}
                      pageTitle={title}
                      pageType={pageType}
                      onChange={(data) =>
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.clientId === block.clientId ? { ...b, data } : b,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm font-medium text-primary">Gespeichert.</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          form={formId}
          className="min-h-11 min-w-[9rem] rounded-md bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] xl:items-start">
      <div className="min-w-0">{editor}</div>
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <ContentLivePreview
          title={title}
          pageType={pageType}
          blocks={previewBlocks}
          products={previewProducts}
        />
      </aside>
    </div>
  );
}
