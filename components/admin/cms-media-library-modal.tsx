"use client";

import Image from "next/image";
import type { CmsMediaLibraryItem } from "@/lib/content/cms-media-library";

const SOURCE_LABEL: Record<CmsMediaLibraryItem["source"], string> = {
  upload: "Upload",
  static: "Medien",
  social: "Social",
  branding: "Branding",
};

type Props = {
  open: boolean;
  onClose: () => void;
  library: CmsMediaLibraryItem[];
  loading: boolean;
  error: string | null;
  onSelect: (url: string) => void;
  title?: string;
};

export function CmsMediaLibraryModal({
  open,
  onClose,
  library,
  loading,
  error,
  onSelect,
  title = "Medien wählen",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-[#e8eaed] px-4 py-3">
          <h3 className="text-base font-semibold text-[#1f2937]">{title}</h3>
          <button
            type="button"
            className="min-h-11 rounded-md px-3 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <p className="text-sm text-[#6b7280]">Lade Medien…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && library.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Keine Medien gefunden.</p>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {library.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.url)}
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
                        item.url.startsWith("https://") || item.url.endsWith(".svg")
                      }
                    />
                  </div>
                  <div className="space-y-0.5 p-2">
                    <p className="truncate text-xs font-medium text-[#1f2937]">{item.label}</p>
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
  );
}
