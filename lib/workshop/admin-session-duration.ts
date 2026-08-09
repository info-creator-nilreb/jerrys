import {
  formatDurationLabel,
  formatWorkshopDurationMinutes,
} from "@/features/workshops";

export const WORKSHOP_SESSION_DURATION_STEP_MINUTES = 30;
export const WORKSHOP_SESSION_DURATION_MIN_MINUTES = 30;
/** Typische Workshop-Länge bis 8 Stunden; erweiterbar bei Bedarf. */
export const WORKSHOP_SESSION_DURATION_MAX_MINUTES = 8 * 60;

export type WorkshopSessionDurationOption = {
  value: number;
  label: string;
};

export function workshopSessionDurationOptions(): WorkshopSessionDurationOption[] {
  const options: WorkshopSessionDurationOption[] = [];
  for (
    let minutes = WORKSHOP_SESSION_DURATION_MIN_MINUTES;
    minutes <= WORKSHOP_SESSION_DURATION_MAX_MINUTES;
    minutes += WORKSHOP_SESSION_DURATION_STEP_MINUTES
  ) {
    options.push({ value: minutes, label: formatDurationLabel(minutes) });
  }
  return options;
}

/** Rundet auf 30-Min-Raster, begrenzt auf Min/Max. */
export function snapWorkshopSessionDurationMinutes(rawMinutes: number): number {
  if (!Number.isFinite(rawMinutes) || rawMinutes <= 0) {
    return WORKSHOP_SESSION_DURATION_MIN_MINUTES;
  }
  const clamped = Math.min(
    WORKSHOP_SESSION_DURATION_MAX_MINUTES,
    Math.max(WORKSHOP_SESSION_DURATION_MIN_MINUTES, Math.round(rawMinutes)),
  );
  const snapped =
    Math.round(clamped / WORKSHOP_SESSION_DURATION_STEP_MINUTES) *
    WORKSHOP_SESSION_DURATION_STEP_MINUTES;
  return Math.min(
    WORKSHOP_SESSION_DURATION_MAX_MINUTES,
    Math.max(WORKSHOP_SESSION_DURATION_MIN_MINUTES, snapped),
  );
}

export function durationMinutesFromSessionRange(startsAt: Date, endsAt: Date): number {
  return snapWorkshopSessionDurationMinutes(formatWorkshopDurationMinutes(startsAt, endsAt));
}

export function addWorkshopDurationMinutes(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}
