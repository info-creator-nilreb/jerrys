import { getPrisma } from "@/lib/db/prisma";
import type { PickupStoreRecord } from "@/lib/shop/pickup-store-shared";

export * from "@/lib/shop/pickup-store-shared";

const pickupStoreSelect = {
  id: true,
  name: true,
  line1: true,
  line2: true,
  zip: true,
  city: true,
  country: true,
  infoUrl: true,
  isActive: true,
  sortOrder: true,
} as const;

export async function listPickupStoresForAdmin(): Promise<PickupStoreRecord[]> {
  return getPrisma().pickupStore.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: pickupStoreSelect,
  });
}

export async function listActivePickupStoresForAdminSelect(): Promise<PickupStoreRecord[]> {
  return getPrisma().pickupStore.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: pickupStoreSelect,
  });
}

export async function getPickupStoreById(id: string): Promise<PickupStoreRecord | null> {
  return getPrisma().pickupStore.findUnique({
    where: { id },
    select: pickupStoreSelect,
  });
}

export async function getActivePickupStoreById(id: string): Promise<PickupStoreRecord | null> {
  return getPrisma().pickupStore.findFirst({
    where: { id, isActive: true },
    select: pickupStoreSelect,
  });
}
