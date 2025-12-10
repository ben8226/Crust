// Helpers to work with local (non-UTC) date strings in YYYY-MM-DD format.
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

