import type { Metadata } from "next";
import { LegalDocumentShell } from "@/components/storefront/legal-document-shell";
import { LegalHtmlBody } from "@/components/storefront/legal-html-body";
import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description: "Widerrufsbelehrung gemäß AGB",
};

export default function WiderrufPage() {
  const html = loadLegalHtmlRaw("widerruf");
  return (
    <LegalDocumentShell title="Widerrufsrecht" breadcrumbLabel="Widerruf">
      <LegalHtmlBody html={html} />
    </LegalDocumentShell>
  );
}
