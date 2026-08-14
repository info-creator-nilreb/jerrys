import {
  billingAddressFromOrder,
  orderAddressText,
  orderAddressesTwoColumnHtml,
  orderBillingAddressHtml,
  orderInvoiceShippedNoteHtml,
  orderItemsHtml,
  orderItemsText,
  orderRefundAmountRowHtml,
  orderShippingAddressAndTrackingHtml,
  orderShippingAddressHtml,
  orderTotalsHtml,
  shippingAddressFromOrder,
  type OrderAddressSource,
} from "@/lib/email/templates/order-fragments";
import type { OrderLineItemForEmail } from "@/lib/email/transactional-email-layout";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";

const PREVIEW_ORDER_NUMBER = "ORD-1001";
const PREVIEW_INVOICE_NUMBER = "RE-2026-0042";
const PREVIEW_CARRIER_LINE = "DHL · 1234567890";
const PREVIEW_TRACKING_URL =
  "https://nolp.dhl.de/nextt-online-public/setShipmentOverview?lang=de&piececode=1234567890";
const PREVIEW_STATUS_URL = `https://example.com/checkout/erfolg?nr=${PREVIEW_ORDER_NUMBER}`;

const PREVIEW_ORDER_ADDRESS: OrderAddressSource = {
  shippingFirstName: "Max",
  shippingLastName: "Muster",
  shippingCompany: null,
  shippingLine1: "Musterstraße 1",
  shippingLine2: null,
  shippingZip: "10115",
  shippingCity: "Berlin",
  shippingCountry: "DE",
  billingFirstName: "Max",
  billingLastName: "Muster",
  billingCompany: null,
  billingLine1: "Musterstraße 1",
  billingLine2: null,
  billingZip: "10115",
  billingCity: "Berlin",
  billingCountry: "DE",
  deliveryMethod: "shipping",
  email: "max@example.com",
};

const PREVIEW_LINE_ITEMS: OrderLineItemForEmail[] = [
  {
    productTitleSnapshot: "Gin Tasting Set",
    quantity: 1,
    lineTotalGrossCents: 4990,
    currency: "EUR",
  },
];

const PREVIEW_ITEMS_FOR_TEXT = [
  {
    productTitleSnapshot: "Gin Tasting Set",
    quantity: 1,
    lineTotalGrossCents: 4990,
    currency: "EUR",
    taxRatePercentSnapshot: 19,
  },
];

/** HTML-Fragmente für Bestell-Vorschau — identisch zu den echten Sendern. */
export function buildPreviewOrderFragments(branding: TransactionalEmailBranding) {
  const subtotal = "49,90 €";
  const shipping = "4,90 €";
  const total = "54,80 €";
  const paymentMethod = "PayPal";
  const shippingAddr = shippingAddressFromOrder(PREVIEW_ORDER_ADDRESS);
  const billingAddr = billingAddressFromOrder(PREVIEW_ORDER_ADDRESS);

  return {
    number: PREVIEW_ORDER_NUMBER,
    subtotal,
    shipping,
    total,
    payment_method: paymentMethod,
    carrier_line: PREVIEW_CARRIER_LINE,
    tracking_url: PREVIEW_TRACKING_URL,
    invoice_number: PREVIEW_INVOICE_NUMBER,
    invoice_note: " (PDF angehängt)",
    cancelled_date: "12.08.2026",
    refund_date: "12.08.2026",
    status_url: PREVIEW_STATUS_URL,
    items_html: orderItemsHtml(PREVIEW_LINE_ITEMS),
    items_text: orderItemsText(PREVIEW_ITEMS_FOR_TEXT),
    totals_html: orderTotalsHtml({
      subtotal,
      shipping,
      total,
      paymentMethod,
    }),
    addresses_html: orderAddressesTwoColumnHtml(PREVIEW_ORDER_ADDRESS),
    shipping_address_html: orderShippingAddressHtml(PREVIEW_ORDER_ADDRESS),
    billing_address_html: orderBillingAddressHtml(PREVIEW_ORDER_ADDRESS),
    shipping_address_text: orderAddressText(shippingAddr),
    billing_address_text: orderAddressText(billingAddr),
    invoice_note_html: orderInvoiceShippedNoteHtml(PREVIEW_INVOICE_NUMBER, true),
    shipping_address_tracking_html: orderShippingAddressAndTrackingHtml(PREVIEW_ORDER_ADDRESS, {
      carrierLine: PREVIEW_CARRIER_LINE,
      trackUrl: PREVIEW_TRACKING_URL,
      primaryColor: branding.primary,
    }),
    refund_amount_row_html: orderRefundAmountRowHtml(total),
  };
}
