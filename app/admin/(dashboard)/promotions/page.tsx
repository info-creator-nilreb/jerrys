import Link from "next/link";
import { PromotionStatusBadge } from "@/components/admin/promotions/promotion-status-badge";
import { PromotionsToolbar } from "@/app/admin/(dashboard)/promotions/promotions-toolbar";
import { setPromotionEnabled } from "@/app/admin/(dashboard)/promotions/actions";
import { listPromotionsForAdmin } from "@/lib/promotions/admin-queries";
import { PROMOTION_TYPES } from "@/lib/promotions/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Promotions",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function typeLabel(promotionType: string) {
  return (PROMOTION_TYPES as Record<string, string>)[promotionType] ?? promotionType;
}

export default async function AdminPromotionsPage() {
  const promotions = await listPromotionsForAdmin();
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Promotions</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Verwalte Rabatte und Promotions für deinen Shop.
          </p>
        </div>
        <PromotionsToolbar />
      </div>

      {promotions.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-6 py-12 text-center">
          <p className="text-sm text-[#6b7280]">
            Noch keine Promotions. Lege Rabatte an, die im Checkout automatisch oder per Code gelten.
          </p>
          <div className="mt-6 flex justify-center">
            <PromotionsToolbar label="Erste Promotion erstellen" />
          </div>
          <p className="mt-4 text-xs text-[#9ca3af]">Tipp: „Promotion erstellen“ öffnet die Auswahl der Rabattart.</p>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3 md:hidden">
            {promotions.map((p) => {
              const expired = now > p.endDate;
              const canToggleOn = !p.isEnabled && !expired;
              const canToggleOff = p.isEnabled;
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1f2937]">{p.title}</p>
                      <p className="mt-0.5 text-xs text-[#6b7280]">{typeLabel(p.promotionType)}</p>
                    </div>
                    <PromotionStatusBadge status={p.displayStatus} />
                  </div>
                  <p className="mt-2 text-xs text-[#6b7280]">
                    {p.usageCount} Anwendungen · {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link
                      href={`/admin/promotions/${p.id}/edit`}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                    >
                      Bearbeiten
                    </Link>
                    {canToggleOn ? (
                      <form action={setPromotionEnabled.bind(null, p.id, true)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center text-sm font-medium text-[#374151] hover:text-primary hover:underline"
                        >
                          Aktivieren
                        </button>
                      </form>
                    ) : null}
                    {canToggleOff ? (
                      <form action={setPromotionEnabled.bind(null, p.id, false)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center text-sm font-medium text-[#374151] hover:text-primary hover:underline"
                        >
                          Deaktivieren
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                <tr>
                  <th className="px-4 py-3 font-medium">Titel</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Anwendungen</th>
                  <th className="px-4 py-3 font-medium">Zeitraum</th>
                  <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8eaed]">
                {promotions.map((p) => {
                  const expired = now > p.endDate;
                  const canToggleOn = !p.isEnabled && !expired;
                  const canToggleOff = p.isEnabled;
                  return (
                    <tr key={p.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-[#1f2937]">{p.title}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{typeLabel(p.promotionType)}</td>
                      <td className="px-4 py-3">
                        <PromotionStatusBadge status={p.displayStatus} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#374151]">{p.usageCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#6b7280]">
                        {formatDate(p.startDate)} – {formatDate(p.endDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/admin/promotions/${p.id}/edit`}
                            className="font-medium text-primary hover:underline"
                          >
                            Bearbeiten
                          </Link>
                          {canToggleOn ? (
                            <form action={setPromotionEnabled.bind(null, p.id, true)}>
                              <button
                                type="submit"
                                className="text-sm font-medium text-[#374151] hover:text-primary hover:underline"
                              >
                                Aktivieren
                              </button>
                            </form>
                          ) : null}
                          {canToggleOff ? (
                            <form action={setPromotionEnabled.bind(null, p.id, false)}>
                              <button
                                type="submit"
                                className="text-sm font-medium text-[#374151] hover:text-primary hover:underline"
                              >
                                Deaktivieren
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
