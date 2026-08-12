"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import {
  confirmProductAiImageAction,
  editProductAiImageAction,
  generateProductAiAltFromUrlAction,
  generateProductAiImageAction,
  type AiImageActionState,
} from "@/app/admin/(dashboard)/products/ai-product-image-actions";

type Props = {
  productId: string;
  productTitle: string;
  materialText?: string | null;
  aiReady: boolean;
  existingImages: Array<{ id: string; url: string; alt: string }>;
};

const EDIT_MODES: Array<{
  value: string;
  label: string;
  hint: string;
  promptRequired: boolean;
  promptPlaceholder: string;
}> = [
  {
    value: "cutout",
    label: "Freistellen",
    hint: "Hintergrund entfernen, Produkt unverändert behalten",
    promptRequired: false,
    promptPlaceholder: "optional: z. B. weißer Studiohintergrund statt transparent",
  },
  {
    value: "lifestyle",
    label: "Lifestyle",
    hint: "Produkt in Boutique-Szene platzieren",
    promptRequired: false,
    promptPlaceholder: "z. B. auf Holztisch mit Kerzenlicht",
  },
  {
    value: "studio",
    label: "Studio / White",
    hint: "Sauberer Kataloghintergrund mit weichem Schatten",
    promptRequired: false,
    promptPlaceholder: "optional: hellgrau statt weiß",
  },
  {
    value: "background_replace",
    label: "Hintergrund ersetzen",
    hint: "Nur den Hintergrund austauschen",
    promptRequired: true,
    promptPlaceholder: "z. B. helle Steinwand, weiches Seitenlicht",
  },
  {
    value: "custom",
    label: "Freie Bearbeitung",
    hint: "Eigener Prompt zur Bildbearbeitung",
    promptRequired: true,
    promptPlaceholder: "Beschreibe die gewünschte Änderung …",
  },
];

export function ProductAiImageAssistant({
  productId,
  productTitle,
  materialText,
  aiReady,
  existingImages,
}: Props) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<"generate" | "edit">("generate");
  const [editMode, setEditMode] = useState("cutout");
  const [genState, genAction, genPending] = useActionState(
    generateProductAiImageAction,
    null as AiImageActionState,
  );
  const [editState, editAction, editPending] = useActionState(
    editProductAiImageAction,
    null as AiImageActionState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmProductAiImageAction,
    null as AiImageActionState,
  );
  const [altState, altAction, altPending] = useActionState(
    generateProductAiAltFromUrlAction,
    null as AiImageActionState,
  );

  useEffect(() => {
    if (confirmState?.ok) {
      router.refresh();
    }
  }, [confirmState?.ok, router]);

  const draftState = workflow === "edit" ? editState : genState;
  const error =
    genState?.error || editState?.error || confirmState?.error || altState?.error;
  const message =
    (!error &&
      (confirmState?.message ||
        editState?.message ||
        genState?.message ||
        altState?.message)) ||
    null;
  const draftReady = Boolean(draftState?.ok && draftState.previewSrc);
  const pending = genPending || editPending || confirmPending || altPending;
  const draftAltDefault =
    draftState?.draftAltText?.trim() || `${productTitle.slice(0, 80)} – Produktbild`;
  const selectedEdit = EDIT_MODES.find((m) => m.value === editMode) ?? EDIT_MODES[0]!;
  const canEditExisting = existingImages.length > 0;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">KI-Bildassistent</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Neues Bild erzeugen oder bestehendes bearbeiten (Freistellen, Lifestyle, Studio). Erst
            nach Bestätigung dauerhaft speichern.
          </p>
        </div>
      </div>

      {!aiReady ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          KI ist nicht bereit. Bitte unter{" "}
          <Link
            href="/admin/einstellungen/integrationen"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Einstellungen → Integrationen
          </Link>{" "}
          OpenAI und Object Storage (Blob) prüfen.
        </p>
      ) : null}

      <div
        className="mt-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Arbeitsmodus"
      >
        <button
          type="button"
          disabled={pending}
          onClick={() => setWorkflow("generate")}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium ${
            workflow === "generate"
              ? "bg-primary text-white"
              : "border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]"
          } disabled:opacity-60`}
        >
          Neu erzeugen
        </button>
        <button
          type="button"
          disabled={pending || !canEditExisting}
          onClick={() => setWorkflow("edit")}
          title={!canEditExisting ? "Zuerst ein Bild in die Galerie laden" : undefined}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium ${
            workflow === "edit"
              ? "bg-primary text-white"
              : "border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]"
          } disabled:opacity-60`}
        >
          Bestehendes bearbeiten
        </button>
      </div>
      {!canEditExisting ? (
        <p className="mt-2 text-xs text-[#6b7280]">
          Für Bearbeitung bitte zuerst mindestens ein Produktbild hochladen.
        </p>
      ) : null}

      <div aria-live="polite" className="mt-4 space-y-2">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm font-medium text-primary" role="status">
            {message}
          </p>
        ) : null}
      </div>

      {workflow === "generate" ? (
        <form action={genAction} className="mt-5 space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="title" value={productTitle} />
          <input type="hidden" name="materials" value={materialText ?? ""} />

          <div>
            <label htmlFor="ai-image-prompt" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Bild-Prompt
            </label>
            <textarea
              id="ai-image-prompt"
              name="prompt"
              required
              rows={3}
              maxLength={2000}
              disabled={!aiReady || pending}
              placeholder="z. B. Produkt auf hellem Holztisch, weiches Tageslicht, Boutique-Ambiente"
              className="w-full resize-y rounded-md border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-image-size" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Format
              </label>
              <select
                id="ai-image-size"
                name="size"
                defaultValue="1024x1024"
                disabled={!aiReady || pending}
                className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                <option value="1024x1024">Quadrat 1024</option>
                <option value="1024x1536">Hochformat</option>
                <option value="1536x1024">Querformat</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="ai-image-instruction"
                className="mb-1 block text-xs font-medium text-[#6b7280]"
              >
                Zusatz (optional)
              </label>
              <input
                id="ai-image-instruction"
                name="instruction"
                type="text"
                maxLength={300}
                disabled={!aiReady || pending}
                placeholder="keine Personen, kein Logo"
                className="h-11 w-full rounded-md border border-[#e5e7eb] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!aiReady || pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            {genPending ? "Erzeuge & prüfe…" : "Bildentwurf erzeugen"}
          </button>
        </form>
      ) : (
        <form action={editAction} className="mt-5 space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="title" value={productTitle} />
          <input type="hidden" name="materials" value={materialText ?? ""} />

          <div>
            <label
              htmlFor="ai-edit-source"
              className="mb-1 block text-xs font-medium text-[#6b7280]"
            >
              Quellbild
            </label>
            <select
              id="ai-edit-source"
              name="sourceImageUrl"
              required
              disabled={!aiReady || pending}
              className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {existingImages.map((img, i) => (
                <option key={img.id} value={img.url}>
                  {img.alt?.trim() || `Bild ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ai-edit-mode" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Bearbeitung
            </label>
            <select
              id="ai-edit-mode"
              name="mode"
              value={editMode}
              onChange={(e) => setEditMode(e.target.value)}
              disabled={!aiReady || pending}
              className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {EDIT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#6b7280]">{selectedEdit.hint}</p>
          </div>

          <div>
            <label htmlFor="ai-edit-prompt" className="mb-1 block text-xs font-medium text-[#6b7280]">
              {selectedEdit.promptRequired ? "Beschreibung" : "Zusatz (optional)"}
            </label>
            <textarea
              id="ai-edit-prompt"
              name="prompt"
              required={selectedEdit.promptRequired}
              rows={3}
              maxLength={2000}
              disabled={!aiReady || pending}
              placeholder={selectedEdit.promptPlaceholder}
              className="w-full resize-y rounded-md border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="ai-edit-size" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Format
            </label>
            <select
              id="ai-edit-size"
              name="size"
              defaultValue="1024x1024"
              disabled={!aiReady || pending}
              className="h-11 w-full max-w-xs rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              <option value="1024x1024">Quadrat 1024</option>
              <option value="1024x1536">Hochformat</option>
              <option value="1536x1024">Querformat</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!aiReady || pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            {editPending ? "Bearbeite & prüfe…" : "Bearbeitung erzeugen"}
          </button>
        </form>
      )}

      {draftReady && draftState?.previewSrc ? (
        <div className="mt-6 space-y-4 rounded-lg border border-[#e8eaed] bg-[#f7f8fa] p-4">
          <p className="text-xs font-medium text-[#374151]">
            Vorschau (temporär)
            {draftState.model ? (
              <span className="ml-2 font-normal text-[#6b7280]">Modell: {draftState.model}</span>
            ) : null}
          </p>
          <div className="mx-auto max-w-sm overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- temporäre Provider-URL / data-URL */}
            <img
              src={draftState.previewSrc}
              alt={draftAltDefault}
              className="aspect-square w-full object-cover"
            />
          </div>

          <form action={confirmAction} className="space-y-3">
            <input type="hidden" name="productId" value={productId} />
            <input
              type="hidden"
              name="temporaryImageUrl"
              value={draftState.temporaryImageUrl ?? ""}
            />
            <input
              type="hidden"
              name="temporaryImageBase64"
              value={draftState.temporaryImageBase64 ?? ""}
            />
            <div>
              <label htmlFor="ai-image-alt" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Alt-Text (Pflicht vor Übernahme)
              </label>
              <input
                key={draftState.previewSrc}
                id="ai-image-alt"
                name="alt"
                type="text"
                required
                maxLength={200}
                defaultValue={draftAltDefault}
                disabled={pending}
                className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
            >
              {confirmPending ? "Speichere…" : "In Galerie übernehmen"}
            </button>
          </form>
        </div>
      ) : null}

      {existingImages.length > 0 ? (
        <div className="mt-8 border-t border-[#e8eaed] pt-6">
          <p className="text-sm font-medium text-[#374151]">Alt-Text für bestehendes Bild</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Erzeugt nur einen Entwurf — Speichern der Alt-Texte folgt später in der Galerie-UI.
          </p>
          <form action={altAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="title" value={productTitle} />
            <div className="min-w-0 flex-1">
              <label htmlFor="ai-alt-image" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Bild wählen
              </label>
              <select
                id="ai-alt-image"
                name="imageUrl"
                required
                disabled={!aiReady || pending}
                className="h-11 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {existingImages.map((img, i) => (
                  <option key={img.id} value={img.url}>
                    {img.alt?.trim() || `Bild ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!aiReady || pending}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
            >
              {altPending ? "Erzeuge…" : "Alt-Text-Entwurf"}
            </button>
          </form>
          {altState?.ok && altState.draftAltText ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[#f7f8fa] p-3 text-sm text-[#1f2937]">
              {altState.draftAltText}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
