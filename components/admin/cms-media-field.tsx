"use client";

import { ImageIcon, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { CmsMediaLibraryModal } from "@/components/admin/cms-media-library-modal";
import {
  listCmsMediaLibraryAction,
  uploadCmsMediaAction,
} from "@/app/admin/(dashboard)/inhalte/media-actions";
import type { CmsMediaLibraryItem } from "@/lib/content/cms-media-library";

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

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        {/* Desktop: Höhe = rechte Spalte (Aktionen + Pfad), Breite via aspect-ratio. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#e3e4e8] bg-[#f7f8fa] sm:aspect-square sm:h-auto sm:min-h-28 sm:w-auto sm:shrink-0 sm:self-stretch">
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 160px"
              unoptimized={
                value.startsWith("https://") || value.endsWith(".svg")
              }
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="size-8 text-[#9ca3af]" aria-hidden />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
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

      <CmsMediaLibraryModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        library={library}
        loading={loadingLibrary}
        error={libraryError}
        onSelect={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
