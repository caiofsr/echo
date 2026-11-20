export function hoursDisplayFormatter(timezone?: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export function hoursDateFormatter(timezone: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "medium",
  });
  return (seconds: number) =>
    formatter.format(seconds * 1000).replace(" ", "T");
}

export function hoursTimestamp(
  value: string,
  localDate: ReturnType<typeof hoursDateFormatter>,
  original?: number,
) {
  const wallTime = value.length === 16 ? value + ":00" : value;
  if (original !== undefined && localDate(original) === wallTime)
    return original;
  const utc = Date.parse(wallTime + "Z") / 1000;
  if (!Number.isFinite(utc)) return null;

  // Try the offsets on either side of the date to handle clock transitions.
  for (const sample of [utc - 86400, utc, utc + 86400]) {
    const offset = Date.parse(localDate(sample) + "Z") / 1000 - sample;
    const candidate = utc - offset;
    if (localDate(candidate) === wallTime) return candidate;
  }
  return null;
}

export type HoursFilters = {
  from: string;
  to: string;
  client: string;
  project: string;
};

export function filterHours<
  T extends {
    startedAt: number;
    clientId: number | null;
    projectId: number | null;
  },
>(
  records: readonly T[],
  filters: HoursFilters,
  localDate: ReturnType<typeof hoursDateFormatter>,
) {
  return records.filter((record) => {
    if (filters.client && String(record.clientId) !== filters.client)
      return false;
    if (filters.project && String(record.projectId) !== filters.project)
      return false;
    const date = localDate(record.startedAt).slice(0, 10);
    return (
      (!filters.from || date >= filters.from) &&
      (!filters.to || date <= filters.to)
    );
  });
}
