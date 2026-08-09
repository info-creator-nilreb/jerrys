export const STOREFRONT_WORKSHOP_AVAILABILITY = [
  "bookable",
  "sold_out",
  "minimum_not_met",
] as const;

export type StorefrontWorkshopAvailability = (typeof STOREFRONT_WORKSHOP_AVAILABILITY)[number];

export type StorefrontWorkshopSessionInput = {
  status: string;
  startsAt: Date;
  endsAt: Date;
  now: Date;
  capacity: number;
  confirmedSeatCount: number;
  heldSeatCount: number;
  minimumParticipants: number;
};

export type StorefrontWorkshopSessionView = {
  availability: StorefrontWorkshopAvailability;
  seatsRemaining: number;
  seatsReservedTotal: number;
  minimumParticipants: number;
  minimumParticipantsMet: boolean;
  isUpcoming: boolean;
};

export function computeStorefrontWorkshopSessionView(
  input: StorefrontWorkshopSessionInput,
): StorefrontWorkshopSessionView {
  const seatsReservedTotal = input.confirmedSeatCount + input.heldSeatCount;
  const seatsRemaining = Math.max(0, input.capacity - seatsReservedTotal);
  const minimumParticipantsMet = input.confirmedSeatCount >= input.minimumParticipants;
  const isUpcoming = input.startsAt.getTime() > input.now.getTime();

  let availability: StorefrontWorkshopAvailability = "bookable";
  if (seatsRemaining <= 0) {
    availability = "sold_out";
  } else if (!minimumParticipantsMet) {
    availability = "minimum_not_met";
  }

  return {
    availability,
    seatsRemaining,
    seatsReservedTotal,
    minimumParticipants: input.minimumParticipants,
    minimumParticipantsMet,
    isUpcoming,
  };
}

export function storefrontWorkshopAvailabilityLabel(
  availability: StorefrontWorkshopAvailability,
): string {
  switch (availability) {
    case "bookable":
      return "Buchbar";
    case "sold_out":
      return "Ausgebucht";
    case "minimum_not_met":
      return "Buchbar · Mindestteilnehmer noch offen";
    default:
      return availability;
  }
}

export {
  formatDurationLabel,
  formatWorkshopDurationMinutes,
} from "@/lib/workshop/duration-format";
