import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEmailTemplateCatalogEntry,
  isEmailTemplateKey,
  sampleVarsForTemplate,
  type EmailTemplateKey,
} from "@/lib/email/templates/catalog";
import { getEmailTemplateByKey } from "@/lib/email/templates/load";
import { EmailTemplateEditor } from "@/app/admin/(dashboard)/emails/email-template-editor";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";
import { renderEmailBodies } from "@/lib/email/templates/render";
import type { TransactionalHeroVariant } from "@/lib/email/email-icon-assets";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ key: string }>;
};

function heroVariantForTemplate(key: EmailTemplateKey): TransactionalHeroVariant {
  switch (key) {
    case "order_shipped":
      return "shipping";
    case "order_refunded":
      return "refund";
    case "email_verify":
    case "magic_link":
    case "password_reset":
      return "account";
    case "workshop_booking_confirmation":
    case "workshop_booking_cancelled":
    case "workshop_date_request_approved":
    case "workshop_date_request_rejected":
      return "workshop";
    default:
      return "order";
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { key } = await params;
  if (!isEmailTemplateKey(key)) return { title: "E-Mail-Vorlage" };
  const entry = getEmailTemplateCatalogEntry(key);
  return { title: `${entry.name} · E-Mails` };
}

export default async function AdminEmailTemplateEditPage({ params }: PageProps) {
  const { key } = await params;
  if (!isEmailTemplateKey(key)) notFound();

  const [template, branding] = await Promise.all([
    getEmailTemplateByKey(key),
    resolveTransactionalEmailBranding(),
  ]);
  const entry = getEmailTemplateCatalogEntry(key);

  const sample = sampleVarsForTemplate(key);
  const previewVars = mergeTemplateVars(
    sample,
    buildShopTemplateVars(branding, {
      cta: {
        href: String(
          (sample.email as { cta_url?: string } | undefined)?.cta_url ?? "https://example.com",
        ),
        label: String(
          (sample.email as { cta_label?: string } | undefined)?.cta_label ?? "Weiter",
        ),
      },
      heroVariant: heroVariantForTemplate(key),
    }),
  );
  const initialPreview = renderEmailBodies(
    {
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
    },
    previewVars,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#6b7280]">
              <Link href="/admin/emails" className="text-primary hover:underline">
                E-Mails
              </Link>
              <span className="mx-1.5 text-[#d1d5db]">/</span>
              {entry.name}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
              {entry.name}
            </h1>
            <p className="mt-1 text-sm text-[#6b7280]">{entry.description}</p>
          </div>
        </div>
      </div>

      <EmailTemplateEditor
        templateKey={key}
        name={template.name}
        initialSubject={template.subject}
        initialHtmlBody={template.htmlBody}
        initialTextBody={template.textBody}
        initialEnabled={template.enabled}
        variables={entry.variables}
        sampleVars={previewVars}
        initialPreviewHtml={initialPreview.html}
        initialPreviewSubject={initialPreview.subject}
      />
    </div>
  );
}
