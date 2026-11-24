export type TimesheetRow = {
  startedAt: number;
  endedAt: number | null;
  clientName: string;
  projectName: string;
  taskName: string | null;
};

export function formatTimesheetDate(value: number, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: "h23",
  }).format(value * 1000);
}

export function formatTimesheetDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function formatTimesheetEnd(row: TimesheetRow, timezone: string) {
  return row.endedAt === null
    ? "Em andamento"
    : formatTimesheetDate(row.endedAt, timezone);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function formatTimesheetRowDuration(
  row: TimesheetRow,
  serverNow: number,
) {
  return formatTimesheetDuration((row.endedAt ?? serverNow) - row.startedAt);
}

export function formatTimesheetCsv(
  rows: readonly TimesheetRow[],
  timezone: string,
  serverNow: number,
  includeTask: boolean,
) {
  const headers = [
    "Início",
    "Fim",
    "Cliente",
    "Projeto",
    ...(includeTask ? ["Tarefa"] : []),
    "Horas trabalhadas",
  ];
  const lines = rows.map((row) =>
    [
      formatTimesheetDate(row.startedAt, timezone),
      formatTimesheetEnd(row, timezone),
      row.clientName,
      row.projectName,
      ...(includeTask ? [row.taskName ?? "Sem tarefa"] : []),
      formatTimesheetRowDuration(row, serverNow),
    ]
      .map(csvCell)
      .join(";"),
  );
  return `\uFEFF${headers.map(csvCell).join(";")}\r\n${lines.join("\r\n")}${lines.length ? "\r\n" : ""}`;
}
