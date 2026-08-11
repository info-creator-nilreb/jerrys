"use client";

import { ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  listCmsMediaLibraryAction,
  uploadCmsMediaAction,
} from "@/app/admin/(dashboard)/inhalte/media-actions";
import type { CmsMediaLibraryItem } from "@/lib/content/cms-media-library";

const SOURCE_LABEL: Record<CmsMediaLibraryItem["source"], string> = {
  upload: "Upload",
  static: "Medien",
  social: "Social",
  branding: "Branding",
};

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Optional: schreibt Hidden-Input für Server Actions / FormData. */
  name?: string;
  required?: boolean;
  hint?: string;
};

export function CmsMediaField({
  label,
  value,
  onChange,
  name,
  required,
  hint,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<CmsMediaLibraryItem[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingLibrary, startLibraryTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();

  function openPicker() {
    setPickerOpen(true);
    setLibraryError(null);
    startLibraryTransition(async () => {
      try {
        setLibrary(await listCmsMediaLibraryAction());
      } catch {
        setLibraryError("Medienbibliothek konnte nicht geladen werden.");
      }
    });
  }

  function onFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    startUploadTransition(async () => {
      const result = await uploadCmsMediaAction(null, formData);
      if (result?.ok && result.url) {
        onChange(result.url);
        setPickerOpen(false);
        startLibraryTransition(async () => {
          setLibrary(await listCmsMediaLibraryAction());
        });
      } else {
        setUploadError(result?.error ?? "Upload fehlgeschlagen.");
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-[#5c5f66]">
          {label}
          {required ? <span className="text-primary"> *</span> : null}
        </p>
        {hint ? <p className="text-xs text-[#9ca3af]">{hint}</p> : null}
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e3e4e8] bg-[#f7f8fa]">
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized={
                value.startsWith("https://") || value.endsWith(".svg")
              }
            />
          ) : (
            <ImageIcon className="size-6 text-[#9ca3af]" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadPending}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
            >
              <Upload className="size-4" aria-hidden strokeWidth={1.75} />
              {uploadPending ? "Lädt…" : "Hochladen"}
            </button>
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex min-h-11 items-center rounded-md border border-[#e3e4e8] bg-white px-3 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Aus Medien wählen
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Entfernen
              </button>
            ) : null}
          </div>
          <label className="block text-xs text-[#6b7280]">
            Oder Pfad / HTTPS-URL
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              placeholder="/media/… oder https://…"
              className="mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => onFileSelected(e.currentTarget.files)}
      />
      {uploadError ? (
        <p className="text-sm text-red-600" role="alert">
          {uploadError}
        </p>
      ) : null}

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Medien wählen"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#e8eaed] px-4 py-3">
              <h3 className="text-base font-semibold text-[#1f2937]">Medienbibliothek</h3>
              <button
                type="button"
                className="min-h-11 rounded-md px-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                onClick={() => setPickerOpen(false)}
              >
                Schließen
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingLibrary ? (
                <p className="text-sm text-[#6b7280]">Lade Medien…</p>
              ) : null}
              {libraryError ? (
                <p className="text-sm text-red-600">{libraryError}</p>
              ) : null}
              {!loadingLibrary && !libraryError && library.length === 0 ? (
                <p className="text-sm text-[#6b7280]">Keine Medien gefunden.</p>
              ) : null}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {library.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(item.url);
                        setPickerOpen(false);
                      }}
                      className="group flex w-full flex-col overflow-hidden rounded-lg border border-[#e8eaed] text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="relative aspect-square bg-[#f7f8fa]">
                        <Image
                          src={item.url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="160px"
                          unoptimized={
                            item.url.startsWith("https://") ||
                            item.url.endsWith(".svg")
                          }
                        />
                      </div>
                      <div className="space-y-0.5 p-2">
                        <p className="truncate text-xs font-medium text-[#1f2937]">
                          {item.label}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                          {SOURCE_LABEL[item.source]}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
