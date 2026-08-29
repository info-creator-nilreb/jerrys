import { getPrisma } from "@/lib/db/prisma";
import {
  parsePickupInfoUrl,
  pickupStoresFromFormData,
  type PickupStoreFormRow,
} from "@/lib/shop/pickup-store-shared";

function isCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code.trim().toUpperCase());
}

function validatePickupStoreRows(rows: PickupStoreFormRow[]): Record<string, string> | null {
  const fieldErrors: Record<string, string> = {};
  for (const row of rows) {
    if (!row.name.trim()) {
      fieldErrors.pickupStores = "Jeder Abholort braucht einen Namen.";
      break;
    }
    if (!row.line1.trim()) {
      fieldErrors.pickupStores = "Straße und Hausnummer sind erforderlich.";
      break;
    }
    if (!row.zip.trim() || !row.city.trim()) {
      fieldErrors.pickupStores = "PLZ und Ort sind erforderlich.";
      break;
    }
    if (!isCountryCode(row.country)) {
      fieldErrors.pickupStores = "Ungültiger Ländercode.";
      break;
    }
    if (row.infoUrl.trim() && !parsePickupInfoUrl(row.infoUrl)) {
      fieldErrors.pickupStores = "Info-Link muss ein interner Pfad oder eine HTTPS-URL sein.";
      break;
    }
  }
  return Object.keys(fieldErrors).length ? fieldErrors : null;
}

/** Speichert Abholorte aus dem Versand-Formular (Upsert + Löschen entfernter Zeilen). */
export async function syncPickupStoresFromFormData(
  formData: FormData,
): Promise<{ fieldErrors?: Record<string, string> } | null> {
  const rows = pickupStoresFromFormData(formData);
  const fieldErrors = validatePickupStoreRows(rows);
  if (fieldErrors) return { fieldErrors };

  const prisma = getPrisma();
  const existing = await prisma.pickupStore.findMany({ select: { id: true } });
  const submittedIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const data = {
        name: row.name.trim(),
        line1: row.line1.trim(),
        line2: row.line2.trim() ? row.line2.trim() : null,
        zip: row.zip.trim(),
        city: row.city.trim(),
        country: row.country.trim().toUpperCase(),
        infoUrl: parsePickupInfoUrl(row.infoUrl),
        isActive: row.isActive,
        sortOrder: i,
      };
      if (row.id) {
        await tx.pickupStore.update({ where: { id: row.id }, data });
      } else {
        await tx.pickupStore.create({ data });
      }
    }

    const toDelete = existing.filter((e) => !submittedIds.has(e.id));
    for (const row of toDelete) {
      await tx.pickupStore.delete({ where: { id: row.id } });
    }
  });

  return null;
}
