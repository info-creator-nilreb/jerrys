"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductImage,
  setProductCoverImage,
  uploadProductImages,
  type ProductFormState,
} from "@/app/admin/(dashboard)/products/actions";

type ImageRow = { id: string; url: string; alt: string; sortOrder: number; isCover: boolean };

export function ProductMediaSection({
  productId,
  images,
}: {
  productId: string;
  images: ImageRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setErr(null);
      setMessage(null);
      const fd = new FormData();
      for (const f of Array.from(files)) {
        fd.append("files", f);
      }
      startTransition(async () => {
        const res: ProductFormState = await uploadProductImages(productId, fd);
        if (res?.error) setErr(res.error);
        else {
          setMessage("Dateien hochgeladen.");
          refresh();
        }
      });
    },
    [productId, refresh],
  );

  const onDelete = (id: string) => {
    setErr(null);
    startTransition(async () => {
      const r = await deleteProductImage(id);
      if (r.error) setErr(r.error);
      else refresh();
    });
  };

  const onCover = (id: string) => {
    setErr(null);
    startTransition(async () => {
      const r = await setProductCoverImage(id);
      if (r.error) setErr(r.error);
      else refresh();
    });
  };

  const cover = images.find((i) => i.isCover) ?? images[0];
  const thumbs = images;

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[#1f2937]">Medien</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Füge Dateien zur Mediengalerie des Produkts hinzu.
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
          void onUpload(e.dataTransfer.files);
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
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}

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
              {thumbs.map((img) => (
                <li key={img.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onCover(img.id)}
                    className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-[#f9fafb] transition-colors ${
                      img.isCover ? "border-primary" : "border-[#e5e7eb] hover:border-primary/50"
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
                    onClick={() => onDelete(img.id)}
                    className="mt-1 w-full text-center text-xs text-red-600 hover:underline"
                  >
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
