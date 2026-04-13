import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Informationen zur Verarbeitung personenbezogener Daten",
};

export default function DatenschutzPage() {
  const html = loadLegalHtmlRaw("datenschutz");
  return (
    <LegalDocumentShell title="Datenschutzerklärung" breadcrumbLabel="Datenschutz">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
