"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createReshipShipmentDraftAction,
  purchaseInternetmarkeLabelForOrderAction,
  voidInternetmarkeLabelAction,
  type InternetmarkeLabelActionState,
  type ReshipShipmentActionState,
} from "@/app/admin/(dashboard)/orders/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const purchaseInitial: InternetmarkeLabelActionState = null;
const voidInitial: InternetmarkeLabelActionState = null;
const reshipInitial: ReshipShipmentActionState = null;

export type OrderShipmentRow = {
  id: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  labelProvider: string;
  labelExternalRef: string | null;
  labelPurchasedAt: Date | string | null;
  voidedAt: Date | string | null;
  shippedAt: Date | string | null;
  createdAt: Date | string;
};

type Props = {
  orderId: string;
  configured: boolean;
  canPrepareShipment: boolean;
  /** Erneute Versendung nach Retoure / erstem Versand. */
  canReship: boolean;
  shipments: OrderShipmentRow[];
};

function shipmentStatusLabelDe(status: string): string {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "labeled":
      return "Label erstellt";
    case "shipped":
      return "Versandt";
    case "delivered":
      return "Zugestellt";
    case "voided":
      return "Storniert";
    case "returned":
      return "Retoure";
    default:
      return status;
  }
}

export function OrderInternetmarkePanel({
  orderId,
  configured,
  canPrepareShipment,
  canReship,
  shipments,
}: Props) {
  const router = useRouter();
  const [purchaseState, purchaseAction, purchasePending] = useActionState(
    purchaseInternetmarkeLabelForOrderAction,
    purchaseInitial,
  );
  const [voidState, voidAction, voidPending] = useActionState(
    voidInternetmarkeLabelAction,
    voidInitial,
  );
  const [reshipState, reshipAction, reshipPending] = useActionState(
    createReshipShipmentDraftAction,
    reshipInitial,
  );
  const [reshipConfirmOpen, setReshipConfirmOpen] = useState(false);

  const reshipOk = reshipState != null && "ok" in reshipState && reshipState.ok;

  useEffect(() => {
    if (!purchaseState?.ok && !voidState?.ok && !reshipOk) return;
    router.refresh();
  }, [purchaseState?.ok, voidState?.ok, reshipOk, router]);

  const openLabeled = shipments.filter((s) => s.status === "labeled" || s.status === "draft");
  const hasInternetmarkeLabel = shipments.some(
    (s) => s.status === "labeled" && s.labelProvider === "internetmarke",
  );
  const hasOpenDraft = shipments.some((s) => s.status === "draft");
  const hasPurchasablePath = configured && canPrepareShipment && !hasInternetmarkeLabel;
  const showReship = canReship && !hasOpenDraft;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#374151]">Versand & Retoure</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Internetmarke kaufen, Labels stornieren (Anbieter-Retoure) und nach Retoure erneut
          versenden. Zahlung der Bestellung bleibt davon unberührt.
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" className="space-y-2">
        {purchaseState?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {purchaseState.error}
          </p>
        ) : null}
        {voidState?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {voidState.error}
          </p>
        ) : null}
        {reshipState && "error" in reshipState ? (
          <p className="text-sm text-red-600" role="alert">
            {reshipState.error}
          </p>
        ) : null}
        {purchaseState?.ok ? (
          <div className="rounded-md border border-[#e8eaed] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151]">
            <p className="font-medium text-primary" role="status">
              {purchaseState.message ?? "Label gekauft."}
            </p>
            {purchaseState.trackingNumber ? (
              <p className="mt-1 font-mono text-xs">Tracking: {purchaseState.trackingNumber}</p>
            ) : null}
            {purchaseState.labelDownloadUrl ? (
              <p className="mt-2">
                <a
                  href={purchaseState.labelDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Label-PDF jetzt herunterladen
                </a>
                <span className="mt-1 block text-xs text-[#6b7280]">
                  Der Link ist temporär — bitte sofort speichern (dauerhafte Ablage folgt).
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
        {voidState?.ok ? (
          <p className="text-sm font-medium text-primary" role="status">
            {voidState.message ?? "Storniert."}
          </p>
        ) : null}
        {reshipOk && reshipState && "message" in reshipState ? (
          <p className="text-sm font-medium text-primary" role="status">
            {reshipState.message}
          </p>
        ) : null}
      </div>

      {!configured ? (
        <p className="text-sm text-[#6b7280]">
          Internetmarke nicht konfiguriert. Unter{" "}
          <Link
            href="/admin/einstellungen/integrationen"
            className="font-medium text-primary hover:underline"
          >
            Admin → Einstellungen → Integrationen
          </Link>{" "}
          verbinden. Manueller Versand und Reship-Entwurf bleiben möglich.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hasPurchasablePath ? (
          <form action={purchaseAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <button
              type="submit"
              disabled={purchasePending || voidPending || reshipPending}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
            >
              {purchasePending ? "Kaufe Label…" : "Internetmarke kaufen"}
            </button>
          </form>
        ) : null}

        {showReship ? (
          <button
            type="button"
            disabled={reshipPending || purchasePending || voidPending}
            onClick={() => setReshipConfirmOpen(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            Erneut versenden
          </button>
        ) : null}
      </div>

      {configured && !canPrepareShipment && !showReship ? (
        <p className="text-sm text-[#6b7280]">
          Für diese Bestellung kann gerade kein neues Label vorbereitet werden (Status oder reine
          Terminbuchung).
        </p>
      ) : null}

      <form id={`reship-form-${orderId}`} action={reshipAction} className="hidden" aria-hidden>
        <input type="hidden" name="orderId" value={orderId} />
      </form>

      <ConfirmDialog
        open={reshipConfirmOpen}
        title="Erneut versenden?"
        description="Es wird ein neuer Sendungsentwurf angelegt (Reship). Anschließend kannst du ein neues Label kaufen oder manuell als versandt markieren."
        confirmLabel="Entwurf anlegen"
        variant="primary"
        pending={reshipPending}
        onCancel={() => setReshipConfirmOpen(false)}
        onConfirm={() => {
          setReshipConfirmOpen(false);
          const form = document.getElementById(`reship-form-${orderId}`) as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      />

      {shipments.length > 0 ? (
        <ul className="divide-y divide-[#e8eaed] rounded-lg border border-[#e8eaed]">
          {shipments.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-[#1f2937]">
                  {shipmentStatusLabelDe(s.status)}
                  {s.labelProvider !== "none" ? (
                    <span className="ml-2 text-xs font-normal text-[#6b7280]">
                      · {s.labelProvider}
                    </span>
                  ) : (
                    <span className="ml-2 text-xs font-normal text-[#6b7280]">· manuell</span>
                  )}
                </p>
                {s.labelExternalRef ? (
                  <p className="font-mono text-xs text-[#6b7280]">Ref: {s.labelExternalRef}</p>
                ) : null}
                {s.trackingNumber ? (
                  <p className="font-mono text-xs text-[#6b7280]">
                    {s.carrier ? `${s.carrier} · ` : null}
                    {s.trackingNumber}
                  </p>
                ) : null}
              </div>
              {s.labelProvider === "internetmarke" &&
              (s.status === "labeled" || s.status === "draft") &&
              s.labelExternalRef ? (
                <form action={voidAction}>
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="shipmentId" value={s.id} />
                  <button
                    type="submit"
                    disabled={voidPending || purchasePending || reshipPending}
                    className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {voidPending ? "Storniere…" : "Label stornieren"}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : openLabeled.length === 0 ? (
        <p className="text-sm text-[#6b7280]">Noch keine Sendungen zu dieser Bestellung.</p>
      ) : null}
    </div>
  );
}
