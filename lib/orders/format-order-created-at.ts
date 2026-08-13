/** Server- und Client-taugliche Datumsformatierung für Admin-Bestelllisten. */
const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatOrderCreatedAt(d: Date): string {
  return dateFmt.format(d);
}
