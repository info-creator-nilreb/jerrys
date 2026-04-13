import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "Rückgabe",
  description: "Rücksendung, Umtausch und defekte Ware",
};

export default function RueckgabePage() {
  const html = loadLegalHtmlRaw("rueckgabe");
  return (
    <LegalDocumentShell title="Rückgabe & Umtausch" breadcrumbLabel="Rückgabe">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
