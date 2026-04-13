import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung",
};

export default function ImpressumPage() {
  const html = loadLegalHtmlRaw("impressum");
  return (
    <LegalDocumentShell title="Impressum">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
