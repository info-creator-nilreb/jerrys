export const DELIVERY_TIME_OPTIONS = [
  { value: "1-2-werktage", label: "1–2 Werktage" },
  { value: "2-4-werktage", label: "2–4 Werktage" },
  { value: "5-7-werktage", label: "5–7 Werktage" },
  { value: "1-2-wochen", label: "1–2 Wochen" },
] as const;

export type DeliveryTimeKey = (typeof DELIVERY_TIME_OPTIONS)[number]["value"];
