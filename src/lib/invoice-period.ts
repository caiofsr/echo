import { hoursDateFormatter, hoursTimestamp } from "./hours-date";

const dayPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDay(value: string) {
  const match = dayPattern.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  return (
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day)
  );
}

export function nextDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Start of a local day in the configured timezone, in Unix seconds.
 * The invoice period is half-open: [from 00:00, day after to 00:00).
 */
export function dayStartSeconds(value: string, timezone: string) {
  const timestamp = hoursTimestamp(
    `${value}T00:00:00`,
    hoursDateFormatter(timezone),
  );
  if (timestamp === null)
    throw new Error(
      "Não foi possível interpretar o período no fuso configurado.",
    );
  return timestamp;
}
