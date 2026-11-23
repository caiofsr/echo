import { afterEach, expect, test } from "bun:test";
import {
  filterHours,
  hoursDateFormatter,
  hoursTimestamp,
} from "../src/lib/hours-date";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { migrate } from "drizzle-orm/libsql/migrator";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createBoardStore } from "../src/server/board";
import { createDirectoryStore } from "../src/server/directory";
import { createTimerStore } from "../src/server/timer";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "echo-timer-"));
  const url = `file:${join(dir, "timer.db")}`;
  const a = await openDatabase(url);
  await migrateDatabase(a.db);
  const b = await openDatabase(url);
  cleanup.push(async () => {
    a.close();
    b.close();
    await rm(dir, { recursive: true });
  });
  let now = 100_900;
  return {
    db: a.db,
    a: createTimerStore(a.db, () => now),
    b: createTimerStore(b.db, () => now),
    clock: (value: number) => {
      now = value;
    },
  };
}
test("persiste início entre conexões, encerra em segundos e retoma sem a pausa", async () => {
  const { a, b, clock } = await setup();
  expect((await a.getState()).preferences.timezone).toBe("America/Recife");
  await a.savePreferences({
    hourlyRateCents: 12500,
    currency: "USD",
    timezone: "UTC",
  });
  expect((await a.command({ action: "start", version: 0 })).ok).toBe(true);
  expect((await b.getState()).active?.startedAt).toBe(100);
  clock(165_800);
  await b.command({ action: "stop", version: 1 });
  expect((await a.getState()).records[0]).toMatchObject({
    startedAt: 100,
    endedAt: 165,
    hourlyRateCents: 12500,
    currency: "USD",
  });
  await a.savePreferences({
    hourlyRateCents: 5000,
    currency: "BRL",
    timezone: "America/Recife",
  });
  clock(300_000);
  await a.command({ action: "resume", version: 2 });
  clock(330_000);
  await a.command({ action: "stop", version: 3 });
  const state = await b.getState();
  expect(state.records.map((r) => [r.startedAt, r.endedAt])).toEqual([
    [300, 330],
    [100, 165],
  ]);
  expect(state.records[1].hourlyRateCents).toBe(12500);
  expect(state.records[0].hourlyRateCents).toBe(5000);
});

test("disputas de início e parada têm um vencedor e comandos antigos não afetam novo período", async () => {
  const { a, b, clock } = await setup();
  const starts = await Promise.all([
    a.command({ action: "start", version: 0 }),
    b.command({ action: "start", version: 0 }),
  ]);
  expect(starts.filter((r) => r.ok)).toHaveLength(1);
  expect((await a.getState()).records).toHaveLength(1);
  clock(120_000);
  const stops = await Promise.all([
    a.command({ action: "stop", version: 1 }),
    b.command({ action: "stop", version: 1 }),
  ]);
  expect(stops.filter((r) => r.ok)).toHaveLength(1);
  clock(150_000);
  await b.command({ action: "resume", version: 2 });
  expect((await a.command({ action: "stop", version: 1 })).ok).toBe(false);
  expect((await b.getState()).active?.startedAt).toBe(150);
});

test("rejeita entradas inválidas e relógio regressivo sem perder o período ativo", async () => {
  const { a, clock } = await setup();
  await expect(
    a.savePreferences({
      hourlyRateCents: -1,
      currency: "BRL",
      timezone: "UTC",
    }),
  ).rejects.toThrow();
  await expect(
    a.savePreferences({
      hourlyRateCents: 10,
      currency: "USD",
      timezone: "Inválido",
    }),
  ).rejects.toThrow();
  await expect(a.command({ action: "resume", version: 0 })).rejects.toThrow(
    "Nenhuma atividade",
  );
  await a.command({ action: "start", version: 0 });
  clock(90_000);
  await expect(a.command({ action: "stop", version: 1 })).rejects.toThrow(
    "relógio",
  );
  expect((await a.getState()).version).toBe(1);
  expect((await a.getState()).active?.endedAt).toBeNull();
});

test("atualiza banco que aplicou a primeira migração do cronômetro sem recriar tabelas ou perder registros", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-timer-legacy-"));
  const { db, close } = await openDatabase(`file:${join(dir, "legacy.db")}`);
  cleanup.push(async () => {
    close();
    await rm(dir, { recursive: true });
  });
  const migrationsFolder = join(dir, "drizzle");
  await cp("drizzle", migrationsFolder, { recursive: true });
  const journalPath = join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  journal.entries = journal.entries.slice(0, 6);
  await writeFile(journalPath, JSON.stringify(journal));
  await migrate(db, { migrationsFolder });
  await db.run(
    "INSERT INTO time_record (started_at, hourly_rate_cents, currency) VALUES (100, 0, 'BRL')",
  );
  await db.run("UPDATE time_record SET ended_at = 150 WHERE id = 1");

  await migrateDatabase(db);
  await migrateDatabase(db);
  const timer = createTimerStore(db, () => 200_000);
  expect((await timer.getState()).records).toMatchObject([
    {
      id: 1,
      startedAt: 100,
      endedAt: 150,
      hourlyRateCents: 0,
      currency: "BRL",
    },
  ]);
  await timer.command({ action: "resume", version: 2 });
  expect((await timer.getState()).version).toBe(3);
});

async function taskFixture(db: Parameters<typeof createBoardStore>[0]) {
  const board = createBoardStore(db);
  const directory = createDirectoryStore(db);
  const client = await directory.saveClient({
    name: "Cliente",
    legalName: "",
    taxId: "",
    address: "",
  });
  const project = await directory.saveProject({
    name: "Projeto",
    clientId: client.id,
    hourlyRate: "120,00",
    currency: "USD",
  });
  const column = await board.saveColumn({ name: "Fazendo" });
  const task = await board.saveTask({
    title: "Implementar",
    description: "Descrição original",
    projectId: project.id,
    columnId: column.id,
  });
  return { board, directory, client, project, column, task };
}

test("inicia Tarefa com descrição própria, associações e valor preservado", async () => {
  const { a, b, db, clock } = await setup();
  const { board, directory, client, project, column, task } =
    await taskFixture(db);
  expect(
    (await a.command({ action: "start", taskId: task.id, version: 0 })).ok,
  ).toBe(true);
  expect((await b.getState()).active).toMatchObject({
    taskId: task.id,
    projectId: project.id,
    clientId: client.id,
    description: "Descrição original",
    hourlyRateCents: 12000,
    currency: "USD",
  });
  await board.saveTask({
    ...task,
    title: "Renomeada",
    description: "Outra descrição",
    columnId: column.id,
  });
  await directory.saveProject({
    ...project,
    hourlyRate: "200,00",
    currency: "BRL",
  });
  clock(160_000);
  await a.command({ action: "stop", version: 1 });
  expect((await b.getState()).records[0]).toMatchObject({
    description: "Descrição original",
    hourlyRateCents: 12000,
    currency: "USD",
    endedAt: 160,
  });
});

test("troca de Tarefa é atômica, disputas têm um vencedor e mover não altera contagem", async () => {
  const { a, b, db, clock } = await setup();
  const { board, task, column } = await taskFixture(db);
  const next = await board.saveTask({ title: "Segunda", columnId: column.id });
  const other = await board.saveTask({
    title: "Terceira",
    columnId: column.id,
  });
  await a.command({ action: "start", taskId: task.id, version: 0 });
  clock(160_000);
  const results = await Promise.all([
    a.command({ action: "start", taskId: next.id, version: 1 }),
    b.command({ action: "start", taskId: other.id, version: 1 }),
  ]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  const winner = results[0].ok ? next : other;
  const state = await b.getState();
  expect(state.records).toHaveLength(2);
  expect(state.active).toMatchObject({
    taskId: winner.id,
    startedAt: 160,
    projectId: null,
  });
  expect(state.records[1]).toMatchObject({ taskId: task.id, endedAt: 160 });
  await board.moveTask({ taskId: winner.id, columnId: column.id, position: 0 });
  expect((await a.getState()).active).toEqual(state.active);
  clock(190_000);
  await a.command({ action: "stop", version: state.version });
  clock(300_000);
  const stopped = await a.getState();
  await a.command({ action: "resume", version: stopped.version });
  expect((await b.getState()).active).toMatchObject({
    taskId: winner.id,
    startedAt: 300,
  });
});

test("falha ao salvar nova Tarefa reverte parada e preserva versão e período", async () => {
  const { a, db, clock } = await setup();
  const { board, task, column } = await taskFixture(db);
  const next = await board.saveTask({ title: "Segunda", columnId: column.id });
  await a.command({ action: "start", taskId: task.id, version: 0 });
  const before = await a.getState();
  // Fault injection at the storage boundary; observations use the public query.
  await db.run(
    "CREATE TRIGGER fail_record AFTER INSERT ON time_record BEGIN SELECT RAISE(ABORT, 'save failed'); END",
  );
  clock(160_000);
  await expect(
    a.command({ action: "start", taskId: next.id, version: 1 }),
  ).rejects.toThrow();
  const after = await a.getState();
  expect(after.records).toEqual(before.records);
  expect(after.version).toBe(before.version);
});

test("retomada preserva associações e descrição do período, usando o valor atual do Projeto", async () => {
  const { a, db, clock } = await setup();
  const { board, directory, task, project, column } = await taskFixture(db);
  await a.command({ action: "start", taskId: task.id, version: 0 });
  clock(160_000);
  await a.command({ action: "stop", version: 1 });
  await board.saveTask({
    ...task,
    description: "Descrição alterada",
    projectId: null,
    columnId: column.id,
  });
  await directory.saveProject({
    ...project,
    hourlyRate: "200,00",
    currency: "BRL",
  });
  clock(300_000);
  await a.command({ action: "resume", version: 2 });
  const state = await a.getState();
  expect(state.active).toMatchObject({
    taskId: task.id,
    projectId: project.id,
    description: "Descrição original",
    hourlyRateCents: 20000,
    currency: "BRL",
    startedAt: 300,
  });
  expect(state.records[1]).toMatchObject({
    hourlyRateCents: 12000,
    currency: "USD",
    endedAt: 160,
  });
});

test("iniciar a mesma Tarefa ou uma inexistente não perde a contagem", async () => {
  const { a, db, clock } = await setup();
  const { task } = await taskFixture(db);
  await a.command({ action: "start", taskId: task.id, version: 0 });
  clock(160_000);
  expect(
    (await a.command({ action: "start", taskId: task.id, version: 1 })).ok,
  ).toBe(false);
  await expect(
    a.command({ action: "start", taskId: 999999, version: 1 }),
  ).rejects.toThrow("Tarefa não encontrada");
  expect((await a.getState()).active).toMatchObject({
    taskId: task.id,
    startedAt: 100,
  });
  expect((await a.getState()).records).toHaveLength(1);
});

test("lança registro manual em segundos e preserva valor e moeda ao vincular Projeto", async () => {
  const { a, b, db } = await setup();
  const { client, project } = await taskFixture(db);
  await a.savePreferences({
    hourlyRateCents: 4500,
    currency: "BRL",
    timezone: "UTC",
  });
  expect(
    await a.saveRecord({
      startedAt: 11,
      endedAt: 44,
      description: "Pesquisa",
      taskId: null,
      projectId: null,
      clientId: null,
    }),
  ).toMatchObject({ ok: true });
  const [record] = (await b.getState()).records;
  expect(record).toMatchObject({
    startedAt: 11,
    endedAt: 44,
    projectId: null,
    hourlyRateCents: 4500,
    currency: "BRL",
  });
  expect(
    await b.saveRecord({
      ...record,
      description: "Pesquisa",
      endedAt: 44,
      projectId: project.id,
      clientId: client.id,
    }),
  ).toMatchObject({ ok: true });
  expect((await a.getState()).records[0]).toMatchObject({
    projectId: project.id,
    clientId: client.id,
    hourlyRateCents: 4500,
    currency: "BRL",
  });
});

test("lançamento manual com Tarefa mantém cronômetro ativo e identifica conflitos", async () => {
  const { a, b, db, clock } = await setup();
  const { board, task, project, client } = await taskFixture(db);
  await a.command({ action: "start", taskId: task.id, version: 0 });
  const active = (await a.getState()).active!;
  clock(180_000);
  const input = {
    description: "Revisão",
    taskId: task.id,
    projectId: project.id,
    clientId: null,
    startedAt: 70,
    endedAt: 100,
  };
  expect(await b.saveRecord({ ...input, endedAt: 101 })).toMatchObject({
    ok: false,
    conflict: { id: active.id, startedAt: 100, endedAt: null },
  });
  expect((await b.saveRecord(input)).ok).toBe(true);
  expect((await a.getState()).active).toEqual(active);
  const record = (await a.getState()).records.find(
    (record) => record.id !== active.id,
  )!;
  expect(record).toMatchObject({
    clientId: client.id,
    hourlyRateCents: 12000,
    currency: "USD",
  });
  expect(
    (
      await b.saveRecord({
        ...input,
        id: record.id,
        version: record.version,
        description: "Descrição corrigida",
        startedAt: 69,
      })
    ).ok,
  ).toBe(true);
  expect(
    (await a.getState()).records.find(({ id }) => id === record.id),
  ).toMatchObject({
    startedAt: 69,
    endedAt: 100,
    description: "Descrição corrigida",
  });
  expect((await board.getBoard()).tasks[0].description).toBe(
    "Descrição original",
  );
  const { version } = await a.getState();
  expect((await a.command({ action: "stop", version })).ok).toBe(true);
});

test("gravações simultâneas de períodos e revisões da mesma linha têm um vencedor", async () => {
  const { a, b } = await setup();
  const input = {
    description: "Primeiro",
    taskId: null,
    projectId: null,
    clientId: null,
    startedAt: 10,
    endedAt: 30,
  };
  const created = await Promise.all([
    a.saveRecord(input),
    b.saveRecord({ ...input, startedAt: 20, endedAt: 40 }),
  ]);
  expect(created.filter(({ ok }) => ok)).toHaveLength(1);
  const [record] = (await a.getState()).records;
  expect(created.find(({ ok }) => !ok)).toMatchObject({
    conflict: { id: record.id },
  });
  const update = { ...input, id: record.id, version: record.version };
  const edits = await Promise.all([
    a.saveRecord({ ...update, description: "Edição A" }),
    b.saveRecord({ ...update, description: "Edição B" }),
  ]);
  expect(edits.filter(({ ok }) => ok)).toHaveLength(1);
  expect((await a.getState()).records[0].description).toBe(
    edits[0].ok ? "Edição A" : "Edição B",
  );
});

test("filtra dados persistidos pelo início no fuso e pelas associações históricas", async () => {
  const { a, db, clock } = await setup();
  const { client, project } = await taskFixture(db);
  clock(Date.parse("2026-06-02T06:00:00Z"));
  const starts = (iso: string) => Date.parse(iso) / 1000;
  const free = starts("2026-06-02T02:59:59Z");
  const linked = starts("2026-06-02T03:00:00Z");
  const fields = {
    description: "Pesquisa",
    taskId: null,
    projectId: null,
    clientId: null,
  };
  expect(
    (await a.saveRecord({ ...fields, startedAt: free, endedAt: linked })).ok,
  ).toBe(true);
  expect(
    (
      await a.saveRecord({
        ...fields,
        projectId: project.id,
        startedAt: linked,
        endedAt: linked + 17,
      })
    ).ok,
  ).toBe(true);
  const { records, preferences } = await a.getState();
  const date = hoursDateFormatter(preferences.timezone);
  const filters = { from: "", to: "", client: "", project: "" };
  expect(filterHours(records, filters, date)).toHaveLength(2);
  expect(
    filterHours(records, { ...filters, to: "2026-06-01" }, date).map(
      ({ projectId }) => projectId,
    ),
  ).toEqual([null]);
  expect(
    filterHours(
      records,
      { ...filters, from: "2026-06-02", client: String(client.id) },
      date,
    ).map(({ projectId }) => projectId),
  ).toEqual([project.id]);
  expect(
    filterHours(records, { ...filters, project: String(project.id) }, date),
  ).toHaveLength(1);
  expect(hoursTimestamp("2026-06-01T23:59:59", date)).toBe(free);
  const newYork = hoursDateFormatter("America/New_York");
  expect(hoursTimestamp("2026-03-08T02:30", newYork)).toBeNull();
  expect(
    hoursTimestamp("2026-11-01T01:30", newYork, starts("2026-11-01T06:30:00Z")),
  ).toBe(starts("2026-11-01T06:30:00Z"));
});

test("corrige um registro de zero segundos sem ampliar o período", async () => {
  const { a, clock } = await setup();
  await a.command({ action: "start", version: 0 });
  await a.command({ action: "stop", version: 1 });
  clock(150_000);
  const [record] = (await a.getState()).records;
  const fields = {
    startedAt: 100,
    endedAt: 100,
    description: "Conferência",
    taskId: null,
    clientId: null,
    projectId: null,
  };
  expect((await a.saveRecord(fields)).ok).toBe(false);
  expect(
    (await a.saveRecord({ ...fields, id: record.id, version: record.version }))
      .ok,
  ).toBe(true);
  expect((await a.getState()).records[0]).toMatchObject({
    startedAt: 100,
    endedAt: 100,
    description: "Conferência",
  });
});

test("lançamentos manuais não disputam o comando de parada nem substituem a última contagem", async () => {
  const { a, b, clock } = await setup();
  await a.command({ action: "start", version: 0 });
  clock(140_000);
  expect(
    (
      await b.saveRecord({
        startedAt: 50,
        endedAt: 80,
        description: "Trabalho anterior",
        taskId: null,
        clientId: null,
        projectId: null,
      })
    ).ok,
  ).toBe(true);
  expect((await a.command({ action: "stop", version: 1 })).ok).toBe(true);
  clock(200_000);
  expect(
    (
      await b.saveRecord({
        startedAt: 150,
        endedAt: 170,
        description: "Trabalho posterior",
        taskId: null,
        clientId: null,
        projectId: null,
      })
    ).ok,
  ).toBe(true);
  const state = await a.getState();
  expect(state.records[0].description).toBe("Trabalho posterior");
  expect(state.lastTimedRecord).toMatchObject({ startedAt: 100, endedAt: 140 });
  expect((await a.command({ action: "resume", version: 2 })).ok).toBe(true);
  expect((await b.getState()).active).toMatchObject({
    startedAt: 200,
    description: null,
  });
});

test("edições simultâneas de linhas diferentes não criam sobreposição", async () => {
  const { a, b } = await setup();
  const fields = {
    description: "Revisão",
    taskId: null,
    clientId: null,
    projectId: null,
  };
  await a.saveRecord({ ...fields, startedAt: 10, endedAt: 20 });
  await a.saveRecord({ ...fields, startedAt: 70, endedAt: 80 });
  const [later, earlier] = (await a.getState()).records;
  const changes = await Promise.all([
    a.saveRecord({
      ...fields,
      id: earlier.id,
      version: earlier.version,
      startedAt: 30,
      endedAt: 50,
    }),
    b.saveRecord({
      ...fields,
      id: later.id,
      version: later.version,
      startedAt: 40,
      endedAt: 60,
    }),
  ]);
  expect(changes.filter(({ ok }) => ok)).toHaveLength(1);
  expect(changes.find(({ ok }) => !ok)).toMatchObject({
    conflict: { id: changes[0].ok ? earlier.id : later.id },
  });
});
