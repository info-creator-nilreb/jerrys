import { revalidatePath } from "next/cache";

/** Storefront-Routen nach Termin-Lifecycle (Publish, Absage, Buchung …) aktualisieren. */
export function revalidateStorefrontWorkshopSessions(): void {
  revalidatePath("/termine");
  revalidatePath("/termine/wunschtermin");
  revalidatePath("/");
  revalidatePath("/produkte", "layout");
}
