import { expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { formatTimesheetCsv, type TimesheetRow } from "../src/lib/timesheet";
import { createTimesheetPdf } from "../src/lib/timesheet-pdf";

const rows: TimesheetRow[] = [
  {
    startedAt: Date.parse("2025-01-15T12:00:00Z") / 1000,
    endedAt: Date.parse("2025-01-15T13:00:37Z") / 1000,
    clientName: "Estúdio Árvore",
    projectName: "Site novo",
    taskName: "Revisão",
  },
  {
    startedAt: Date.parse("2025-01-16T12:00:00Z") / 1000,
    endedAt: null,
    clientName: "Sem cliente",
    projectName: "Sem projeto",
    taskName: null,
  },
];

test("CSV exporta períodos no fuso e omite tarefa quando não solicitada", () => {
  const csv = formatTimesheetCsv(rows, "America/Recife", 100, false);

  expect(csv).toBe(
    '\uFEFF"Início";"Fim";"Cliente";"Projeto";"Horas trabalhadas"\r\n' +
      '"15/01/2025, 09:00:00";"15/01/2025, 10:00:37";"Estúdio Árvore";"Site novo";"01:00:37"\r\n' +
      '"16/01/2025, 09:00:00";"Em andamento";"Sem cliente";"Sem projeto";"00:00:00"\r\n',
  );
});

test("CSV pode incluir tarefa e escapa campos com aspas", () => {
  const csv = formatTimesheetCsv(
    [{ ...rows[0], clientName: 'Cliente "A"' }],
    "UTC",
    0,
    true,
  );

  expect(csv).toContain('"Tarefa"');
  expect(csv).toContain('"Cliente ""A"""');
  expect(csv).toContain('"Revisão"');
});

test("PDF gera um documento com a opção de Tarefa escolhida", async () => {
  const bytes = await createTimesheetPdf(rows, "America/Recife", 100, true);

  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  expect(bytes.byteLength).toBeGreaterThan(1000);
});

test("PDF pagina nomes longos sem cortar conteúdo", async () => {
  const bytes = await createTimesheetPdf(
    [{ ...rows[0], clientName: "Cliente".repeat(500) }],
    "UTC",
    0,
    false,
  );
  const document = await PDFDocument.load(bytes);

  expect(document.getPageCount()).toBeGreaterThan(1);
});
