import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
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
  const { a, db, clock } = await setup();
  await a.command({ action: "start", version: 0 });
  clock(150_000);
  await a.command({ action: "stop", version: 1 });
  const before = (await a.getState()).records;
  // Fixture: the dev server had applied 0005 before revision triggers existed.
  await db.run("DROP TRIGGER time_record_start_revision");
  await db.run("DROP TRIGGER time_record_stop_revision");
  await db.run(
    "DELETE FROM __drizzle_migrations WHERE created_at > 1794300000000",
  );
  await db.run("DROP TRIGGER time_record_switch");
  for (const column of ["task_id", "project_id", "client_id", "description"])
    await db.run(`ALTER TABLE time_record DROP COLUMN ${column}`);
  await migrateDatabase(db);
  await migrateDatabase(db);
  expect((await a.getState()).records).toEqual(before);
  clock(200_000);
  await a.command({ action: "resume", version: 2 });
  expect((await a.getState()).version).toBe(3);
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
