const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Interpretiert `datetime-local` (YYYY-MM-DDTHH:mm) als Wanduhrzeit in `timeZone`, liefert UTC.
 */
export function parseLocalDateTimeInTimeZone(local: string, timeZone: string): Date | null {
  const m = LOCAL_DATETIME.exec(local.trim());
  if (!m) return null;

  const target = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function partsToObject(d: Date) {
    const parts = fmt.formatToParts(d);
    const num = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    return {
      year: num("year"),
      month: num("month"),
      day: num("day"),
      hour: num("hour") % 24,
      minute: num("minute"),
    };
  }

  function diffMinutes(a: typeof target, b: typeof target): number {
    return (
      (a.year - b.year) * 525_600 +
      (a.month - b.month) * 43_200 +
      (a.day - b.day) * 1_440 +
      (a.hour - b.hour) * 60 +
      (a.minute - b.minute)
    );
  }

  let utcMs = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  for (let i = 0; i < 6; i++) {
    const shown = partsToObject(new Date(utcMs));
    const delta = diffMinutes(target, shown);
    if (delta === 0) return new Date(utcMs);
    utcMs += delta * 60_000;
  }

  return new Date(utcMs);
}

/** Für `<input type="datetime-local">` aus UTC + Zeitzone. */
export function formatLocalDateTimeInTimeZone(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const y = get("year");
  const mo = get("month");
  const d = get("day");
  const h = get("hour").padStart(2, "0");
  const mi = get("minute").padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export const WORKSHOP_TIMEZONE_OPTIONS = [
  { value: "Europe/Berlin", label: "Europe/Berlin (DE)" },
  { value: "Europe/Vienna", label: "Europe/Vienna (AT)" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CH)" },
] as const;
