import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen",
};

export default function AgbPage() {
  const html = loadLegalHtmlRaw("agb");
  return (
    <LegalDocumentShell title="Allgemeine Geschäftsbedingungen (AGB)" breadcrumbLabel="AGB">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
