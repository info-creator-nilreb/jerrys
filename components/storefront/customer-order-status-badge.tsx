import { orderStatusLabel } from "@/lib/orders/order-status-label";
import { fulfillmentStatusLabel, type FulfillmentStatus } from "@/features/orders";
import { isPickupDeliveryMethod } from "@/lib/checkout/delivery-method";

function asFulfillmentStatus(value: string): FulfillmentStatus {
  switch (value) {
    case "unfulfilled":
    case "preparing":
    case "shipped":
    case "delivered":
    case "returned":
      return value;
    default:
      return "unfulfilled";
  }
}

export function CustomerOrderStatusBadge({
  status,
  fulfillmentStatus,
  deliveryMethod,
}: {
  status: string;
  fulfillmentStatus: string;
  deliveryMethod?: string | null;
}) {
  const fulfillmentPrefix = isPickupDeliveryMethod(deliveryMethod) ? "Abholung" : "Versand";
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center rounded-full border border-(--surface-muted) bg-(--surface-soft) px-2.5 py-1 text-xs font-medium text-(--foreground-heading)">
        {orderStatusLabel(status)}
      </span>
      <span className="inline-flex items-center rounded-full border border-(--surface-muted) px-2.5 py-1 text-xs font-medium text-(--foreground-muted)">
        {fulfillmentPrefix}: {fulfillmentStatusLabel(asFulfillmentStatus(fulfillmentStatus))}
      </span>
    </div>
  );
}
