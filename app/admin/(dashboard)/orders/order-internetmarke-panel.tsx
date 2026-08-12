"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  purchaseInternetmarkeLabelForOrderAction,
  voidInternetmarkeLabelAction,
  type InternetmarkeLabelActionState,
} from "@/app/admin/(dashboard)/orders/actions";

const purchaseInitial: InternetmarkeLabelActionState = null;
const voidInitial: InternetmarkeLabelActionState = null;

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

  useEffect(() => {
    if (!purchaseState?.ok && !voidState?.ok) return;
    router.refresh();
  }, [purchaseState?.ok, voidState?.ok, router]);

  const openLabeled = shipments.filter((s) => s.status === "labeled" || s.status === "draft");
  const hasInternetmarkeLabel = shipments.some(
    (s) => s.status === "labeled" && s.labelProvider === "internetmarke",
  );
  const hasPurchasablePath = configured && canPrepareShipment && !hasInternetmarkeLabel;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#374151]">Internetmarke</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Porto über die Deutsche-Post-REST-API kaufen. Zahlung der Bestellung bleibt davon unberührt.
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
      </div>

      {!configured ? (
        <p className="text-sm text-[#6b7280]">
          Nicht konfiguriert. Unter{" "}
          <Link
            href="/admin/einstellungen/integrationen"
            className="font-medium text-primary hover:underline"
          >
            Admin → Einstellungen → Integrationen
          </Link>{" "}
          verbinden und ein Porto-Produkt aus der DHL-Liste wählen. Manueller Versand bleibt möglich.
        </p>
      ) : null}

      {hasPurchasablePath ? (
        <form action={purchaseAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            disabled={purchasePending || voidPending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            {purchasePending ? "Kaufe Label…" : "Internetmarke kaufen"}
          </button>
        </form>
      ) : configured && !canPrepareShipment ? (
        <p className="text-sm text-[#6b7280]">
          Für diese Bestellung kann gerade kein neues Label vorbereitet werden (Status, reine
          Terminbuchung oder bereits versandt).
        </p>
      ) : null}

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
                    disabled={voidPending || purchasePending}
                    className="min-h-11 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {voidPending ? "Storniere…" : "Label stornieren"}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : openLabeled.length === 0 && configured ? (
        <p className="text-sm text-[#6b7280]">Noch keine Sendungen zu dieser Bestellung.</p>
      ) : null}
    </div>
  );
}
