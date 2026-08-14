"use client";

import { useCallback, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileUp, LoaderCircle } from "lucide-react";
import {
  applyShopifyOrderCsvImport,
  previewShopifyOrderCsvImport,
} from "@/app/admin/(dashboard)/einstellungen/importe/bestellungen/actions";
import {
  SHOPIFY_ORDER_IMPORT_MAX_BYTES,
  type ShopifyOrderImportActionState,
  type ShopifyOrderImportAdminSummary,
} from "@/app/admin/(dashboard)/einstellungen/importe/bestellungen/import-shared";

function statusLabel(status: string): string {
  switch (status) {
    case "would_create":
      return "Wird angelegt";
    case "would_update":
      return "Wird aktualisiert";
    case "would_skip":
      return "Wird übersprungen";
    case "created":
      return "Angelegt";
    case "updated":
      return "Aktualisiert";
    case "skipped":
      return "Übersprungen";
    case "invalid":
      return "Ungültig";
    case "error":
      return "Fehler";
    default:
      return status;
  }
}

function statusClass(status: string): string {
  if (status === "invalid" || status === "error") return "text-red-700";
  if (status === "would_skip" || status === "skipped") return "text-[#6b7280]";
  if (
    status === "created" ||
    status === "updated" ||
    status === "would_create" ||
    status === "would_update"
  ) {
    return "text-emerald-700";
  }
  return "text-[#374151]";
}

function SummaryCards({ summary }: { summary: ShopifyOrderImportAdminSummary }) {
  const items =
    summary.mode === "apply"
      ? [
          { label: "Bestellungen", value: summary.orderCount },
          { label: "Angelegt", value: summary.createdCount },
          { label: "Aktualisiert", value: summary.updatedCount },
          { label: "Übersprungen", value: summary.skippedCount },
          { label: "Ungültig", value: summary.invalidCount },
        ]
      : [
          { label: "Bestellungen", value: summary.orderCount },
          { label: "Gültig", value: summary.validCount },
          { label: "Ungültig", value: summary.invalidCount },
          { label: "Würde überspringen", value: summary.skippedCount },
        ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] px-3 py-3"
        >
          <dt className="text-xs font-medium text-[#6b7280]">{item.label}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-[#1f2937]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ResultTable({ summary }: { summary: ShopifyOrderImportAdminSummary }) {
  if (summary.orders.length === 0) {
    return <p className="mt-6 text-sm text-[#6b7280]">Keine Bestellungen in der CSV erkannt.</p>;
  }

  const showLinks = summary.mode === "apply";

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-[#e8eaed]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
          <tr>
            <th className="px-3 py-2.5 font-medium">Shopify / Nr.</th>
            <th className="px-3 py-2.5 font-medium">E-Mail</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Positionen</th>
            <th className="px-3 py-2.5 font-medium">Hinweise</th>
            {showLinks ? <th className="px-3 py-2.5 font-medium text-right">Admin</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e8eaed]">
          {summary.orders.map((row) => {
            const notes = [
              ...(row.message ? [row.message] : []),
              ...row.errors,
              ...row.warnings.slice(0, 3),
            ];
            const more =
              row.warnings.length > 3
                ? ` (+${row.warnings.length - 3} weitere Warnungen)`
                : "";
            const canLink =
              Boolean(row.orderId) &&
              (row.status === "created" || row.status === "updated");
            return (
              <tr
                key={`${row.orderNumber}-${row.status}`}
                className="bg-white align-top"
              >
                <td className="px-3 py-2.5">
                  <div className="font-medium text-[#1f2937]">{row.orderNumber}</div>
                  {row.shopifyName ? (
                    <div className="text-xs text-[#6b7280]">{row.shopifyName}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-[#374151]">{row.email || "—"}</td>
                <td className={`px-3 py-2.5 font-medium ${statusClass(row.status)}`}>
                  {statusLabel(row.status)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[#374151]">{row.lineCount}</td>
                <td className="px-3 py-2.5 text-[#6b7280]">
                  {notes.length === 0 ? (
                    <span className="text-[#9ca3af]">—</span>
                  ) : (
                    <ul className="list-disc space-y-1 pl-4">
                      {notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                      {more ? <li>{more}</li> : null}
                    </ul>
                  )}
                </td>
                {showLinks ? (
                  <td className="px-3 py-2.5 text-right">
                    {canLink ? (
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Öffnen
                      </Link>
                    ) : (
                      <span className="text-[#9ca3af]">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildImportFormData(opts: {
  file: File;
  taxRatePercent: string;
  updateExisting: boolean;
  confirmApply?: boolean;
}): FormData {
  const fd = new FormData();
  fd.set("file", opts.file);
  fd.set("taxRatePercent", opts.taxRatePercent);
  if (opts.updateExisting) fd.set("updateExisting", "true");
  if (opts.confirmApply) fd.set("confirmApply", "true");
  return fd;
}

function pickCsvFile(list: FileList | File[] | null): File | null {
  if (!list || list.length === 0) return null;
  const file = list[0]!;
  const name = file.name.toLowerCase();
  const okType =
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "";
  return okType ? file : null;
}

export function ShopifyOrderImportForm() {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState("19");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [state, setState] = useState<ShopifyOrderImportActionState>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "preview" | "apply">("idle");

  const summary = state?.summary;
  const applyDone = Boolean(state?.ok && summary?.mode === "apply");
  const canApply =
    Boolean(state?.ok && summary?.mode === "dry-run") &&
    (summary?.invalidCount ?? 1) === 0 &&
    (summary?.validCount ?? 0) > 0 &&
    !applyDone &&
    file != null;

  const assignFile = useCallback((next: File | null, invalidMessage?: string) => {
    if (!next) {
      if (invalidMessage) setState({ error: invalidMessage });
      return;
    }
    if (next.size > SHOPIFY_ORDER_IMPORT_MAX_BYTES) {
      setState({
        error: `Datei zu groß (max. ${Math.round(SHOPIFY_ORDER_IMPORT_MAX_BYTES / (1024 * 1024))} MB).`,
      });
      return;
    }
    setFile(next);
    setState(null);
    setConfirmApply(false);
  }, []);

  function runPreview() {
    if (!file) {
      setState({ error: "Bitte eine Shopify-Bestell-CSV auswählen." });
      return;
    }
    setConfirmApply(false);
    setPhase("preview");
    const fd = buildImportFormData({ file, taxRatePercent, updateExisting });
    startTransition(async () => {
      const next = await previewShopifyOrderCsvImport(null, fd);
      setState(next);
      setPhase("idle");
    });
  }

  function runApply() {
    if (!file || !confirmApply) return;
    setPhase("apply");
    const fd = buildImportFormData({
      file,
      taxRatePercent,
      updateExisting,
      confirmApply: true,
    });
    startTransition(async () => {
      const next = await applyShopifyOrderCsvImport(null, fd);
      setState(next);
      setPhase("idle");
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <label htmlFor={`${formId}-file`} className="text-sm font-medium text-[#374151]">
            Shopify-Bestell-CSV
          </label>
          <div
            role="button"
            tabIndex={0}
            aria-label="CSV-Datei per Drag-and-Drop ablegen oder auswählen"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => {
              if (!pending) fileInputRef.current?.click();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!pending) setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!pending) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              if (pending) return;
              const picked = pickCsvFile(e.dataTransfer.files);
              assignFile(picked, picked ? undefined : "Bitte eine CSV-Datei ablegen (.csv).");
            }}
            className={`mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
              pending
                ? "cursor-not-allowed border-[#d1d5db] bg-[#f3f4f6]"
                : dragOver
                  ? "cursor-pointer border-primary bg-primary/5"
                  : "cursor-pointer border-[#d1d5db] bg-[#f9fafb] hover:border-primary/50"
            }`}
          >
            <FileUp
              className={`size-8 ${dragOver ? "text-primary" : "text-[#9ca3af]"}`}
              aria-hidden
            />
            <p className="mt-3 text-center text-sm text-[#6b7280]">
              CSV hierher ziehen oder Datei auswählen
            </p>
            <p className="mt-1 text-center text-xs text-[#9ca3af]">
              Shopify Admin → Bestellungen → Export · max.{" "}
              {Math.round(SHOPIFY_ORDER_IMPORT_MAX_BYTES / (1024 * 1024))} MB · .csv
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-4 rounded-md border border-[#e3e4e8] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
            >
              Datei auswählen
            </button>
            <input
              ref={fileInputRef}
              id={`${formId}-file`}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const picked = pickCsvFile(e.target.files);
                assignFile(picked, picked ? undefined : "Bitte eine CSV-Datei wählen (.csv).");
                e.target.value = "";
              }}
            />
            {file ? (
              <p className="mt-3 text-sm font-medium text-[#1f2937]">{file.name}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-tax`} className="text-sm font-medium text-[#374151]">
            Steuersatz (Positionen ohne SKU-Match)
          </label>
          <select
            id={`${formId}-tax`}
            value={taxRatePercent}
            disabled={pending}
            onChange={(e) => {
              setTaxRatePercent(e.target.value);
              setState(null);
              setConfirmApply(false);
            }}
            className="mt-1.5 w-full max-w-xs rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="19">19 % (Standard)</option>
            <option value="7">7 %</option>
          </select>
        </div>

        <label className="flex items-start gap-3 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={updateExisting}
            disabled={pending}
            onChange={(e) => {
              setUpdateExisting(e.target.checked);
              setState(null);
              setConfirmApply(false);
            }}
            className="mt-0.5 size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
          />
          <span>
            <span className="font-medium">Bereits importierte Bestellungen aktualisieren</span>
            <span className="mt-0.5 block text-[#6b7280]">
              Treffer über Shopify-Id (idempotencyKey). Ohne Haken werden Duplikate übersprungen.
            </span>
          </span>
        </label>

        <div className="rounded-md border border-[#e8eaed] bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280]">
          Importierte Bestellungen werden als <strong className="font-medium text-[#374151]">Gastbestellungen</strong>{" "}
          angelegt. Kunden mit derselben E-Mail sehen sie nach Registrierung und Verifikation
          automatisch im Konto.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || !file}
            onClick={runPreview}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:opacity-50"
          >
            {phase === "preview" && pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : null}
            Vorschau prüfen
          </button>
          <Link
            href="/admin/orders"
            className="rounded-md px-3 py-2 text-sm font-medium text-[#6b7280] hover:text-[#374151]"
          >
            Abbrechen
          </Link>
        </div>
      </div>

      {state?.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {summary ? (
        <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#1f2937]">
            {summary.mode === "apply" ? "Import-Ergebnis" : "Vorschau"}
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {summary.mode === "apply"
              ? "Historische Bestellungen wurden importiert. Kein Bestandsabzug, keine E-Mails."
              : "Noch nichts geschrieben. Prüfe Status und Hinweise, bevor du importierst."}
          </p>
          <SummaryCards summary={summary} />
          <ResultTable summary={summary} />

          {canApply ? (
            <div className="mt-8 space-y-4 border-t border-[#e8eaed] pt-6">
              <label className="flex items-start gap-3 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={confirmApply}
                  disabled={pending}
                  onChange={(e) => setConfirmApply(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                />
                <span>
                  Ich habe die Vorschau geprüft und möchte den Import jetzt ausführen.
                </span>
              </label>
              <button
                type="button"
                disabled={pending || !confirmApply}
                onClick={runApply}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover) disabled:opacity-50"
              >
                {phase === "apply" && pending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : null}
                Import starten
              </button>
            </div>
          ) : null}

          {applyDone ? (
            <p className="mt-6 text-sm text-primary">
              Fertig.{" "}
              <Link href="/admin/orders" className="font-medium underline">
                Zu den Bestellungen
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
