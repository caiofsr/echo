import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { invoice, invoiceRecord, timeRecord } from "../src/db/schema";
import {
  parseExchangeRate,
  recordAmountFraction,
  roundHalfUpCents,
} from "../src/lib/invoice-math";
import { dayStartSeconds, nextDay } from "../src/lib/invoice-period";
import { createDirectoryStore } from "../src/server/directory";
import { createInvoiceStore } from "../src/server/invoices";
import { createTimerStore } from "../src/server/timer";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "echo-invoices-"));
  const url = `file:${join(dir, "invoices.db")}`;
  const database = await openDatabase(url);
  await migrateDatabase(database.db);
  cleanup.push(async () => {
    database.close();
    await rm(dir, { recursive: true });
  });
  let now = Date.parse("2026-07-15T12:00:00Z");
  return {
    db: database.db,
    directory: createDirectoryStore(database.db),
    timer: createTimerStore(database.db, () => now),
    invoices: createInvoiceStore(database.db),
    clock: (value: number) => {
      now = value;
    },
  };
}

const seconds = (iso: string) => Date.parse(iso) / 1000;

async function createClientAndProject(
  directory: ReturnType<typeof createDirectoryStore>,
  name = "Estúdio",
  project: { name?: string; hourlyRate?: string; currency?: "BRL" | "USD" } = {},
) {
  const client = await directory.saveClient({
    name,
    legalName: "",
    taxId: "",
    address: "",
  });
  const created = await directory.saveProject({
    name: project.name ?? "Site",
    clientId: client.id,
    hourlyRate: project.hourlyRate ?? "100,00",
    currency: project.currency ?? "BRL",
  });
  return { client, project: created };
}

async function saveRecord(
  timer: ReturnType<typeof createTimerStore>,
  input: {
    startedAt: number;
    endedAt: number;
    description?: string;
    projectId?: number | null;
    clientId?: number | null;
  },
) {
  const result = await timer.saveRecord({
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    description: input.description ?? "",
    taskId: null,
    projectId: input.projectId ?? null,
    clientId: input.clientId ?? null,
  });
  expect(result.ok).toBe(true);
}

test("calcula frações de centavo com precisão e meio para cima", () => {
  expect(roundHalfUpCents({ numerator: 1n, denominator: 2n })).toBe(1);
  expect(roundHalfUpCents({ numerator: 1n, denominator: 3n })).toBe(0);
  expect(roundHalfUpCents({ numerator: 2n, denominator: 3n })).toBe(1);
  expect(
    roundHalfUpCents({ numerator: 10000n, denominator: 3n }),
  ).toBe(3333);

  const noQuote = recordAmountFraction(18, 100, "BRL", "BRL", null);
  expect(noQuote).toEqual({ numerator: 1800n, denominator: 3600n });
  expect(roundHalfUpCents(noQuote)).toBe(1);

  const usdToBrl = recordAmountFraction(
    3600,
    6000,
    "USD",
    "BRL",
    parseExchangeRate("5.20"),
  );
  expect(roundHalfUpCents(usdToBrl)).toBe(31200);

  const brlToUsd = recordAmountFraction(
    3600,
    1000,
    "BRL",
    "USD",
    parseExchangeRate("2"),
  );
  expect(roundHalfUpCents(brlToUsd)).toBe(500);

  expect(parseExchangeRate("5,2")).toEqual({
    numerator: 52n,
    denominator: 10n,
  });
  for (const invalid of ["", "0", "0,00", "-1", "abc", "1.123456789"])
    expect(parseExchangeRate(invalid)).toBeNull();
});

test("interpreta o dia local no fuso e atravessa a mudança de horário", () => {
  expect(dayStartSeconds("2026-07-01", "America/Recife")).toBe(
    seconds("2026-07-01T03:00:00Z"),
  );
  expect(dayStartSeconds("2026-08-01", "America/Recife")).toBe(
    seconds("2026-08-01T03:00:00Z"),
  );
  expect(nextDay("2026-12-31")).toBe("2027-01-01");
  expect(dayStartSeconds("2026-03-08", "America/New_York")).toBe(
    seconds("2026-03-08T05:00:00Z"),
  );
  expect(dayStartSeconds("2026-03-09", "America/New_York")).toBe(
    seconds("2026-03-09T04:00:00Z"),
  );
  expect(dayStartSeconds(nextDay("2026-10-31"), "America/New_York")).toBe(
    seconds("2026-11-01T04:00:00Z"),
  );
});

test("prévia inclui somente registros encerrados do cliente e inteiros no período", async () => {
  const { db, directory, invoices, timer } = await setup();
  await timer.savePreferences({
    hourlyRateCents: 0,
    currency: "BRL",
    timezone: "America/Recife",
  });
  const { client, project } = await createClientAndProject(directory);
  const other = await createClientAndProject(directory, "Outro", {
    name: "Outro projeto",
  });

  await saveRecord(timer, {
    startedAt: seconds("2026-06-10T12:00:00Z"),
    endedAt: seconds("2026-06-10T13:00:00Z"),
    description: "Dentro",
    projectId: project.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-06-01T02:30:00Z"),
    endedAt: seconds("2026-06-01T03:30:00Z"),
    description: "Atravessa o início",
    projectId: project.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-01T02:00:00Z"),
    endedAt: seconds("2026-07-01T03:00:00Z"),
    description: "Termina na borda",
    projectId: project.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-01T03:00:00Z"),
    endedAt: seconds("2026-07-01T04:00:00Z"),
    description: "Começa na borda final",
    projectId: project.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-06-12T12:00:00Z"),
    endedAt: seconds("2026-06-12T13:00:00Z"),
    description: "Trabalho livre",
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-06-12T14:00:00Z"),
    endedAt: seconds("2026-06-12T15:00:00Z"),
    description: "Outro cliente",
    projectId: other.project.id,
  });

  const preview = await invoices.preview({
    clientId: client.id,
    from: "2026-06-01",
    to: "2026-06-30",
    currency: "BRL",
    exchangeRate: "",
  });

  expect(preview.lines).toHaveLength(1);
  expect(preview.lines[0]).toMatchObject({
    projectId: project.id,
    hoursSeconds: 7200,
    subtotalCents: 20000,
    rateCents: 10000,
    rateCurrency: "BRL",
  });
  expect(preview.totalCents).toBe(20000);
  expect(preview.includedCount).toBe(2);
  expect(
    preview.exclusions.map(({ description, reason }) => [
      description,
      reason,
    ]),
  ).toEqual([
    ["Trabalho livre", "no-project"],
    ["Atravessa o início", "outside-period"],
  ]);
  expect(await db.select().from(invoice)).toHaveLength(0);
});

test("exclui contagem em andamento e horas já faturadas sem bloquear a prévia", async () => {
  const { db, directory, invoices, timer } = await setup();
  await timer.savePreferences({
    hourlyRateCents: 0,
    currency: "BRL",
    timezone: "UTC",
  });
  const { client, project } = await createClientAndProject(directory);
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T09:00:00Z"),
    endedAt: seconds("2026-07-10T10:00:00Z"),
    description: "Faturado",
    projectId: project.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T11:00:00Z"),
    endedAt: seconds("2026-07-10T12:00:00Z"),
    description: "Elegível",
    projectId: project.id,
  });
  await timer.command({ action: "start", version: 0 });

  const [created] = await db
    .insert(invoice)
    .values({
      clientId: client.id,
      number: 1,
      language: "pt",
      currency: "BRL",
      totalCents: 10000,
      issuedAt: seconds("2026-07-11T00:00:00Z"),
    })
    .returning();
  const [invoiced] = await db
    .select()
    .from(timeRecord)
    .where(eq(timeRecord.description, "Faturado"));
  await db
    .insert(invoiceRecord)
    .values({ invoiceId: created.id, recordId: invoiced.id });

  const preview = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "BRL",
    exchangeRate: "",
  });

  expect(preview.lines[0]).toMatchObject({
    projectId: project.id,
    hoursSeconds: 3600,
    subtotalCents: 10000,
  });
  expect(
    preview.exclusions.map(({ description, reason }) => [
      description,
      reason,
    ]),
  ).toEqual([
    [null, "in-progress"],
    ["Faturado", "already-invoiced"],
  ]);
  expect((await timer.getState()).active).not.toBeNull();

  await db
    .update(invoice)
    .set({ cancelledAt: seconds("2026-07-12T00:00:00Z") })
    .where(eq(invoice.id, created.id));
  const afterCancellation = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "BRL",
    exchangeRate: "",
  });
  expect(afterCancellation.lines[0].hoursSeconds).toBe(7200);
  expect(
    afterCancellation.exclusions.some(
      ({ reason }) => reason === "already-invoiced",
    ),
  ).toBe(false);
});

test("converte por projeto e arredonda cada linha antes de somar o total", async () => {
  const { directory, invoices, timer } = await setup();
  await timer.savePreferences({
    hourlyRateCents: 0,
    currency: "BRL",
    timezone: "UTC",
  });
  const { client } = await createClientAndProject(directory);
  const brl = await directory.saveProject({
    name: "Alpha BRL",
    clientId: client.id,
    hourlyRate: "100,00",
    currency: "BRL",
  });
  const usd = await directory.saveProject({
    name: "Beta USD",
    clientId: client.id,
    hourlyRate: "60,00",
    currency: "USD",
  });
  const halfA = await directory.saveProject({
    name: "Gama Meio A",
    clientId: client.id,
    hourlyRate: "1,00",
    currency: "BRL",
  });
  const halfB = await directory.saveProject({
    name: "Gama Meio B",
    clientId: client.id,
    hourlyRate: "1,00",
    currency: "BRL",
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T09:00:00Z"),
    endedAt: seconds("2026-07-10T10:00:00Z"),
    projectId: brl.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T10:00:00Z"),
    endedAt: seconds("2026-07-10T11:00:00Z"),
    projectId: usd.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T11:00:00Z"),
    endedAt: seconds("2026-07-10T11:00:18Z"),
    projectId: halfA.id,
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T11:01:00Z"),
    endedAt: seconds("2026-07-10T11:01:18Z"),
    projectId: halfB.id,
  });

  const inBrl = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "BRL",
    exchangeRate: "5,20",
  });
  const brlLines = new Map(
    inBrl.lines.map((line) => [line.projectId, line.subtotalCents]),
  );
  expect(brlLines.get(brl.id)).toBe(10000);
  expect(brlLines.get(usd.id)).toBe(31200);
  expect(brlLines.get(halfA.id)).toBe(1);
  expect(brlLines.get(halfB.id)).toBe(1);
  expect(inBrl.totalCents).toBe(41202);
  expect(inBrl.lines.find((line) => line.projectId === usd.id)).toMatchObject({
    rateCents: 6000,
    rateCurrency: "USD",
    hoursSeconds: 3600,
  });

  const inUsd = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "USD",
    exchangeRate: "5.2",
  });
  const usdLines = new Map(
    inUsd.lines.map((line) => [line.projectId, line.subtotalCents]),
  );
  expect(usdLines.get(brl.id)).toBe(1923);
  expect(usdLines.get(usd.id)).toBe(6000);
  expect(usdLines.get(halfA.id)).toBe(0);
  expect(usdLines.get(halfB.id)).toBe(0);
  expect(inUsd.totalCents).toBe(7923);

  await expect(
    invoices.preview({
      clientId: client.id,
      from: "2026-07-01",
      to: "2026-07-31",
      currency: "BRL",
      exchangeRate: "",
    }),
  ).rejects.toThrow("cotação positiva");
  await expect(
    invoices.preview({
      clientId: client.id,
      from: "2026-07-01",
      to: "2026-07-31",
      currency: "BRL",
      exchangeRate: "0",
    }),
  ).rejects.toThrow("cotação positiva");
});

test("mostra horas e subtotal por projeto sem taxa única quando os valores variam", async () => {
  const { directory, invoices, timer } = await setup();
  await timer.savePreferences({
    hourlyRateCents: 0,
    currency: "BRL",
    timezone: "UTC",
  });
  const { client, project } = await createClientAndProject(directory);
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T09:00:00Z"),
    endedAt: seconds("2026-07-10T10:00:00Z"),
    projectId: project.id,
  });
  await directory.saveProject({
    ...project,
    hourlyRate: "200,00",
  });
  await saveRecord(timer, {
    startedAt: seconds("2026-07-10T10:00:00Z"),
    endedAt: seconds("2026-07-10T11:00:00Z"),
    projectId: project.id,
  });

  const preview = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "BRL",
    exchangeRate: "",
  });
  expect(preview.lines).toHaveLength(1);
  expect(preview.lines[0]).toMatchObject({
    projectId: project.id,
    hoursSeconds: 7200,
    subtotalCents: 30000,
    rateCents: null,
    rateCurrency: null,
    serviceDescription: "Site",
  });
});

test("valida cliente, datas e período livre", async () => {
  const { directory, invoices } = await setup();
  const { client } = await createClientAndProject(directory);
  await expect(
    invoices.preview({
      clientId: 9999,
      from: "2026-07-01",
      to: "2026-07-31",
      currency: "BRL",
      exchangeRate: "",
    }),
  ).rejects.toThrow("cliente cadastrado");
  await expect(
    invoices.preview({
      clientId: client.id,
      from: "2026-07-31",
      to: "2026-07-01",
      currency: "BRL",
      exchangeRate: "",
    }),
  ).rejects.toThrow("data inicial");
  await expect(
    invoices.preview({
      clientId: client.id,
      from: "2026-13-01",
      to: "2026-07-31",
      currency: "BRL",
      exchangeRate: "",
    }),
  ).rejects.toThrow("data válida");

  const empty = await invoices.preview({
    clientId: client.id,
    from: "2026-07-01",
    to: "2026-07-31",
    currency: "USD",
    exchangeRate: "inválida",
  });
  expect(empty.lines).toEqual([]);
  expect(empty.totalCents).toBe(0);
});
