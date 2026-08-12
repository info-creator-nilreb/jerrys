import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import {
  EMAIL_TEMPLATE_KEYS,
  type EmailTemplateKey,
  isEmailTemplateKey,
} from "@/lib/email/templates/catalog";
import { getAllEmailTemplateDefaults, getEmailTemplateDefault } from "@/lib/email/templates/defaults";
import { renderEmailBodies, type TemplateVars } from "@/lib/email/templates/render";

export type StoredEmailTemplate = {
  id: string;
  key: EmailTemplateKey;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  enabled: boolean;
  updatedAt: Date;
};

function mapRow(row: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  enabled: boolean;
  updatedAt: Date;
}): StoredEmailTemplate | null {
  if (!isEmailTemplateKey(row.key)) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    subject: row.subject,
    htmlBody: row.htmlBody,
    textBody: row.textBody,
    enabled: row.enabled,
    updatedAt: row.updatedAt,
  };
}

/** Fehlende Templates aus Code-Defaults anlegen; veraltete Basis-HTML (Emoji-Hero) aktualisieren. */
export async function ensureEmailTemplatesSeeded(): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.emailTemplate.findMany();
  const have = new Set(existing.map((e) => e.key));
  const defaults = getAllEmailTemplateDefaults();
  const missing = defaults.filter((d) => !have.has(d.key));

  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((d) =>
        prisma.emailTemplate.create({
          data: {
            key: d.key,
            name: d.name,
            description: d.description,
            subject: d.subject,
            htmlBody: d.htmlBody,
            textBody: d.textBody,
            enabled: true,
          },
        }),
      ),
    );
  }

  // Einmalig: Emoji-basierte Basis-Templates auf Lucide-PNG-Hero + Logo-Platzhalter bringen.
  const stale = existing.filter(
    (row) =>
      /[🛒🚚💵🔑📅🔒✉️📷]/.test(row.htmlBody) ||
      (row.htmlBody.includes("wrap") === false &&
        row.htmlBody.includes("{{{shop.logo_html}}}") &&
        !row.htmlBody.includes("{{{email.hero_icon_html}}}")),
  );
  for (const row of stale) {
    if (!isEmailTemplateKey(row.key)) continue;
    const d = getEmailTemplateDefault(row.key);
    await prisma.emailTemplate.update({
      where: { id: row.id },
      data: {
        name: d.name,
        description: d.description,
        subject: d.subject,
        htmlBody: d.htmlBody,
        textBody: d.textBody,
      },
    });
  }
}

export async function listEmailTemplatesForAdmin(): Promise<StoredEmailTemplate[]> {
  await ensureEmailTemplatesSeeded();
  const rows = await getPrisma().emailTemplate.findMany({
    orderBy: { key: "asc" },
  });
  const byKey = new Map<string, StoredEmailTemplate>();
  for (const row of rows) {
    const mapped = mapRow(row);
    if (mapped) byKey.set(mapped.key, mapped);
  }
  // Katalog-Reihenfolge beibehalten
  return EMAIL_TEMPLATE_KEYS.map((key) => {
    const stored = byKey.get(key);
    if (stored) return stored;
    const d = getEmailTemplateDefault(key);
    return {
      id: "",
      key: d.key,
      name: d.name,
      description: d.description,
      subject: d.subject,
      htmlBody: d.htmlBody,
      textBody: d.textBody,
      enabled: true,
      updatedAt: new Date(0),
    };
  });
}

export async function getEmailTemplateByKey(
  key: EmailTemplateKey,
): Promise<StoredEmailTemplate> {
  await ensureEmailTemplatesSeeded();
  const row = await getPrisma().emailTemplate.findUnique({ where: { key } });
  if (row) {
    const mapped = mapRow(row);
    if (mapped) return mapped;
  }
  const d = getEmailTemplateDefault(key);
  return {
    id: "",
    key: d.key,
    name: d.name,
    description: d.description,
    subject: d.subject,
    htmlBody: d.htmlBody,
    textBody: d.textBody,
    enabled: true,
    updatedAt: new Date(0),
  };
}

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
  enabled: boolean;
};

/**
 * Lädt Template (DB oder Default) und rendert mit Variablen.
 * Wenn `enabled === false`, liefert trotzdem den Inhalt — Caller entscheidet über Skip.
 */
export async function renderStoredEmailTemplate(
  key: EmailTemplateKey,
  vars: TemplateVars,
): Promise<RenderedEmailTemplate> {
  const tpl = await getEmailTemplateByKey(key);
  const bodies = renderEmailBodies(
    { subject: tpl.subject, htmlBody: tpl.htmlBody, textBody: tpl.textBody },
    vars,
  );
  return { ...bodies, enabled: tpl.enabled };
}

export async function updateEmailTemplate(input: {
  key: EmailTemplateKey;
  subject: string;
  htmlBody: string;
  textBody: string;
  enabled: boolean;
}): Promise<StoredEmailTemplate> {
  await ensureEmailTemplatesSeeded();
  const meta = getEmailTemplateDefault(input.key);
  const row = await getPrisma().emailTemplate.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: meta.name,
      description: meta.description,
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      enabled: input.enabled,
    },
    update: {
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      enabled: input.enabled,
    },
  });
  const mapped = mapRow(row);
  if (!mapped) throw new Error("Invalid template key after save");
  return mapped;
}

export async function resetEmailTemplateToDefault(
  key: EmailTemplateKey,
): Promise<StoredEmailTemplate> {
  const d = getEmailTemplateDefault(key);
  return updateEmailTemplate({
    key,
    subject: d.subject,
    htmlBody: d.htmlBody,
    textBody: d.textBody,
    enabled: true,
  });
}
