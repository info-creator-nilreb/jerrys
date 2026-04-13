"use client";

import { ImageUp, Upload } from "lucide-react";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  uploadHomepageSocialImages,
  type StartseiteFormState,
} from "@/app/admin/(dashboard)/startseite/actions";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/admin/upload-image";

const inputClass =
  "w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none ring-primary focus:border-primary focus:ring-1";

const initial: StartseiteFormState = null;

const acceptAttr = "image/jpeg,image/png,image/webp";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileKey(f: File): string {
  return `${f.name}\0${f.size}\0${f.lastModified}`;
}

type FileMergeMode = "append" | "replace";

function setFilesOnInput(
  input: HTMLInputElement,
  incoming: File[],
  mode: FileMergeMode,
): { skipped: string[] } {
  const skipped: string[] = [];
  const dt = new DataTransfer();
  const seen = new Set<string>();
  const add = (f: File) => {
    const k = fileKey(f);
    if (seen.has(k)) return;
    seen.add(k);
    dt.items.add(f);
  };
  if (mode === "append" && input.files) {
    for (const f of Array.from(input.files)) add(f);
  }
  for (const f of incoming) {
    if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
      skipped.push(`„${f.name}“: kein JPEG/PNG/WebP.`);
      continue;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      skipped.push(`„${f.name}“: größer als ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      continue;
    }
    add(f);
  }
  input.files = dt.files;
  return { skipped };
}

export function SocialUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(uploadHomepageSocialImages, initial);
  const [isDragging, setIsDragging] = useState(false);
  const [clientHint, setClientHint] = useState<string | null>(null);
  const [fileSummary, setFileSummary] = useState<string | null>(null);
  const dragDepth = useRef(0);

  const refreshFileSummary = useCallback(() => {
    const el = fileInputRef.current;
    if (!el?.files?.length) {
      setFileSummary(null);
      return;
    }
    const parts = Array.from(el.files).map((f) => `${f.name} (${formatBytes(f.size)})`);
    setFileSummary(parts.join(" · "));
  }, []);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    startTransition(() => {
      setFileSummary(null);
      setClientHint(null);
    });
    router.refresh();
  }, [state, router]);

  const applyIncomingFiles = useCallback(
    (list: FileList | File[], mode: FileMergeMode) => {
      const input = fileInputRef.current;
      if (!input) return;
      const arr = Array.from(list);
      if (arr.length === 0 && mode === "replace") {
        input.files = new DataTransfer().files;
        setFileSummary(null);
        setClientHint(null);
        return;
      }
      if (arr.length === 0) return;
      const { skipped } = setFilesOnInput(input, arr, mode);
      refreshFileSummary();
      if (skipped.length) {
        setClientHint(skipped.slice(0, 4).join(" ") + (skipped.length > 4 ? ` … (+${skipped.length - 4})` : ""));
      } else {
        setClientHint(null);
      }
    },
    [refreshFileSummary],
  );

  const onInputChange = () => {
    const input = fileInputRef.current;
    if (!input) return;
    if (!input.files?.length) {
      setFileSummary(null);
      setClientHint(null);
      return;
    }
    applyIncomingFiles(input.files, "replace");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      applyIncomingFiles(e.dataTransfer.files, "append");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  return (
    <form ref={formRef} action={formAction} encType="multipart/form-data" className="mt-6 space-y-4">
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {clientHint ? (
        <p className="text-sm text-amber-800" role="status">
          {clientHint}
        </p>
      ) : null}
      <div>
        <label htmlFor="social-alt" className="mb-1 block text-xs font-medium text-[#6b7280]">
          Alt-Text (Pflicht, für Barrierefreiheit)
        </label>
        <input
          id="social-alt"
          name="altBase"
          required
          className={inputClass}
          placeholder="z. B. Katze in der Höhle"
        />
      </div>

      <div>
        <p id="social-files-label" className="mb-1 block text-xs font-medium text-[#6b7280]">
          Bilder (mehrfach möglich)
        </p>
        <input
          ref={fileInputRef}
          id="social-files"
          name="files"
          type="file"
          accept={acceptAttr}
          multiple
          className="sr-only"
          onChange={onInputChange}
          disabled={pending}
        />
        <label
          htmlFor="social-files"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          className={`block rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            pending ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${
            isDragging
              ? "border-primary bg-primary/[0.06]"
              : "border-[#d2d5d9] bg-[#fafbfc] hover:border-primary/60 hover:bg-primary/[0.04]"
          }`}
        >
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isDragging ? <Upload className="size-6" aria-hidden strokeWidth={1.75} /> : null}
              {!isDragging ? <ImageUp className="size-6" aria-hidden strokeWidth={1.75} /> : null}
            </span>
            <div className="text-sm text-[#374151]">
              <span className="font-medium text-[#1f2937]">Dateien hierher ziehen</span>
              <span className="text-[#6b7280]"> oder </span>
              <span className="font-semibold text-primary underline decoration-primary/30 underline-offset-2">
                klicken, um auszuwählen
              </span>
            </div>
            <p className="text-xs text-[#6b7280]">
              JPEG, PNG oder WebP · bis {formatBytes(MAX_UPLOAD_BYTES)} pro Datei · mehrere Dateien möglich
            </p>
            <p className="text-xs text-[#9ca3af]" aria-live="polite">
              {fileSummary ?? "Keine Dateien ausgewählt"}
            </p>
          </div>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-50"
      >
        <Upload className="size-4 shrink-0" aria-hidden strokeWidth={2} />
        {pending ? "Hochladen…" : "Hochladen"}
      </button>
    </form>
  );
}
