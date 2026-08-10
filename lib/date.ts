// Helpers to work with local (non-UTC) date strings in YYYY-MM-DD format.

const PICKUP_TIMEZONE = process.env.PICKUP_TIMEZONE || "America/Chicago";

/** Today's date (YYYY-MM-DD) in the bakery pickup timezone. */
export function getTodayDateInPickupTz(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PICKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(dateString?: string | null): Date | null {
  if (!dateString) return null;
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if ([year, month, day].some((n) => Number.isNaN(n))) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function formatPickupDisplay(
  dateString?: string | null,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-US"
): string {
  const parsed = parseLocalDateString(dateString);
  if (!parsed) return "";
  return parsed.toLocaleDateString(locale, options);
}

/** e.g. 1 → "1st", 29 → "29th" */
export function formatOrdinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** e.g. "2026-06-29" → "Monday June 29th" */
export function formatSpecialEventBannerDate(dateString: string): string {
  const parsed = parseLocalDateString(dateString);
  if (!parsed) return "";
  const weekday = parsed.toLocaleDateString("en-US", { weekday: "long" });
  const month = parsed.toLocaleDateString("en-US", { month: "long" });
  return `${weekday} ${month} ${formatOrdinalDay(parsed.getDate())}`;
}

/** Parse "12:00 PM" style string to minutes since midnight. */
export function parseTimeToMinutes(time: string): number | null {
  const match = (time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Format minutes since midnight to "12:00 PM" style. */
export function formatMinutesToTime(mins: number): string {
  const hours24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Convert "12:05 PM" style time to `<input type="time">` value (`HH:MM`). */
export function toTimeInputValue(time: string): string {
  const mins = parseTimeToMinutes(time);
  if (mins == null) return "";
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Convert `<input type="time">` value (`HH:MM`) to "12:05 PM" style. */
export function fromTimeInputValue(value: string): string | null {
  const match = (value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return formatMinutesToTime(hours * 60 + minutes);
}

/** Build 30-minute pickup slots between start and end (inclusive). */
export function buildPickupTimeSlots(startTime: string, endTime: string): string[] {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins == null || endMins == null || startMins > endMins) return [];

  const slots: string[] = [];
  for (let m = startMins; m <= endMins; m += 30) {
    slots.push(formatMinutesToTime(m));
  }
  return slots;
}

