"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  deleteProductImage,
  setProductCoverImage,
  uploadProductImages,
  type ProductFormState,
} from "@/app/admin/(dashboard)/products/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ImageRow = { id: string; url: string; alt: string; sortOrder: number; isCover: boolean };

export function ProductMediaSection({
  productId,
  images: imagesProp,
}: {
  productId: string;
  images: ImageRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageRow[]>(imagesProp);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const [mediaPending, startMediaTransition] = useTransition();

  useEffect(() => {
    setImages(imagesProp);
  }, [imagesProp]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setMessage(null);
      const fd = new FormData();
      for (const f of Array.from(files)) {
        fd.append("files", f);
      }
      startUploadTransition(async () => {
        try {
          const res: ProductFormState = await uploadProductImages(productId, fd);
          if (res?.error) {
            setError(res.error);
            return;
          }
          setMessage("Dateien hochgeladen.");
          refresh();
        } catch {
          setError(
            "Upload fehlgeschlagen. Seite neu laden und erneut versuchen. Auf Vercel ist BLOB_READ_WRITE_TOKEN erforderlich.",
          );
        }
      });
    },
    [productId, refresh],
  );

  const onSetCover = useCallback(
    (imageId: string) => {
      setError(null);
      setMessage(null);
      setPendingId(imageId);
      startMediaTransition(async () => {
        const res = await setProductCoverImage(imageId);
        setPendingId(null);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setImages((prev) =>
          prev.map((img) => ({ ...img, isCover: img.id === imageId })),
        );
        setMessage("Cover aktualisiert.");
        refresh();
      });
    },
    [refresh],
  );

  const onConfirmDelete = useCallback(() => {
    const imageId = confirmDeleteId;
    if (!imageId) return;
    setConfirmDeleteId(null);
    setError(null);
    setMessage(null);
    setPendingId(imageId);
    startMediaTransition(async () => {
      const res = await deleteProductImage(imageId);
      setPendingId(null);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setImages((prev) => {
        const remaining = prev.filter((img) => img.id !== imageId);
        if (remaining.length === 0) return remaining;
        if (remaining.some((img) => img.isCover)) return remaining;
        return remaining.map((img, index) => ({
          ...img,
          isCover: index === 0,
        }));
      });
      setMessage("Bild gelöscht.");
      refresh();
    });
  }, [confirmDeleteId, refresh]);

  const cover = images.find((i) => i.isCover) ?? images[0];
  const pending = uploadPending || mediaPending;
  const confirmImage = confirmDeleteId
    ? images.find((i) => i.id === confirmDeleteId)
    : null;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[#1f2937]">Medien</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Dateien zur Galerie hinzufügen oder nicht mehr benötigte Bilder entfernen.
        </p>
      </div>
      <div className="mt-6 h-px bg-[#e8eaed]" />

      <div
        className={`mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-[#d1d5db] bg-[#f9fafb]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onUpload(e.dataTransfer.files);
        }}
      >
        <p className="text-center text-sm text-[#6b7280]">Dateien zum Hochladen hierhin ziehen</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50"
          >
            Dateien auswählen
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          name="files"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,220px)_1fr]">
          <div>
            {cover ? (
              <>
                <div className="relative aspect-square overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau */}
                  <img src={cover.url} alt="" className="size-full object-cover" />
                </div>
                <p className="mt-2 text-center text-xs text-[#6b7280]">Cover</p>
              </>
            ) : null}
          </div>
          <div>
            <p className="mb-3 text-xs font-medium text-[#6b7280]">Galerie</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img) => {
                const busy = pendingId === img.id && mediaPending;
                return (
                  <li key={img.id} className="relative flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onSetCover(img.id)}
                      className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-[#f9fafb] transition-colors disabled:opacity-50 ${
                        img.isCover
                          ? "border-primary"
                          : "border-[#e5e7eb] hover:border-primary/50"
                      }`}
                      title="Als Cover setzen"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="size-full object-cover" />
                      {img.isCover ? (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Cover
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setConfirmDeleteId(img.id)}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-md px-1 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Bild löschen"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      {busy ? "Löschen…" : "Löschen"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[#6b7280]">Noch keine Bilder in der Galerie.</p>
      )}

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Bild löschen?"
        description={
          confirmImage?.isCover
            ? "Dieses Cover-Bild wirklich entfernen? Ein anderes Galeriebild wird automatisch Cover."
            : "Dieses Produktbild wirklich unwiderruflich aus der Galerie entfernen?"
        }
        confirmLabel="Bild löschen"
        cancelLabel="Abbrechen"
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}
