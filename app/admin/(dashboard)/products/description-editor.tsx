"use client";

import { AdminRichTextEditor } from "@/components/admin/admin-rich-text-editor";

type Props = {
  name: string;
  defaultHtml: string;
  error?: string;
};

/** Produktbeschreibung — kompakte Shopify-ähnliche Formatierungsleiste. */
export function ProductDescriptionEditor({ name, defaultHtml, error }: Props) {
  return (
    <AdminRichTextEditor
      name={name}
      defaultValue={defaultHtml || ""}
      placeholder="Produktbeschreibung …"
      error={error}
      showCharCount
    />
  );
}
