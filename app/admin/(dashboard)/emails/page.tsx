import Link from "next/link";
import {
  EMAIL_TEMPLATE_CATALOG,
  EMAIL_TEMPLATE_GROUP_LABELS,
  type EmailTemplateCatalogEntry,
} from "@/lib/email/templates/catalog";
import { listEmailTemplatesForAdmin } from "@/lib/email/templates/load";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "E-Mails",
};

const GROUP_ORDER: EmailTemplateCatalogEntry["group"][] = [
  "bestellungen",
  "workshops",
  "konto",
];

export default async function AdminEmailsPage() {
  const templates = await listEmailTemplatesForAdmin();
  const byKey = new Map(templates.map((t) => [t.key, t]));

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">E-Mails</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
          Bearbeite Betreff und HTML deiner Transaktionsmails. Variablen wie{" "}
          <code className="rounded bg-[#f3f4f6] px-1 py-0.5 text-xs">{"{{order.number}}"}</code>{" "}
          werden beim Versand ersetzt. Grundlage für spätere Kampagnen.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {GROUP_ORDER.map((group) => {
          const entries = EMAIL_TEMPLATE_CATALOG.filter((e) => e.group === group);
          return (
            <section key={group}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
                {EMAIL_TEMPLATE_GROUP_LABELS[group]}
              </h2>

              <ul className="mt-3 space-y-3 md:hidden">
                {entries.map((entry) => {
                  const tpl = byKey.get(entry.key);
                  return (
                    <li
                      key={entry.key}
                      className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[#1f2937]">{entry.name}</p>
                          <p className="mt-0.5 text-xs text-[#6b7280]">{entry.description}</p>
                        </div>
                        {tpl?.enabled !== false ? (
                          <span className="shrink-0 inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Aktiv
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                            Deaktiviert
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-xs text-[#6b7280]">
                        {tpl?.subject ?? "—"}
                      </p>
                      <Link
                        href={`/admin/emails/${entry.key}/edit`}
                        className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-(--primary-hover)"
                      >
                        Bearbeiten
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Vorlage</th>
                      <th className="px-4 py-3 font-medium">Betreff</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8eaed]">
                    {entries.map((entry) => {
                      const tpl = byKey.get(entry.key);
                      return (
                        <tr key={entry.key} className="bg-white">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#1f2937]">{entry.name}</p>
                            <p className="mt-0.5 text-xs text-[#6b7280]">{entry.description}</p>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-[#6b7280]">
                            {tpl?.subject ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {tpl?.enabled !== false ? (
                              <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                                Aktiv
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                                Deaktiviert
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/emails/${entry.key}/edit`}
                              className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-(--primary-hover)"
                            >
                              Bearbeiten
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
