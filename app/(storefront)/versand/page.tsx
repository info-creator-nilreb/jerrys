import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "Versand",
  description: "Informationen zu Zahlung, Versand und Lieferländern",
};

export default function VersandPage() {
  const html = loadLegalHtmlRaw("versand");
  return (
    <LegalDocumentShell title="Zahlung und Versand" breadcrumbLabel="Versand">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
