import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { invoice, invoiceRecord } from "../src/db/schema";
import { createDirectoryStore } from "../src/server/directory";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createArchiveStore } from "../src/server/archive";
import { createBoardStore } from "../src/server/board";
import { createTaskDeletionStore } from "../src/server/task-deletion";
import { createTimerStore } from "../src/server/timer";

async function withTask(
  run: (fixture: Awaited<ReturnType<typeof setup>>) => Promise<void>,
) {
  const connection = await openDatabase(":memory:");
  try {
    await run(await setup(connection.db));
  } finally {
    connection.close();
  }
}

async function setup(db: Awaited<ReturnType<typeof openDatabase>>["db"]) {
  await migrateDatabase(db);
  const board = createBoardStore(db);
  const column = await board.saveColumn({ name: "Em andamento" });
  const task = await board.saveTask({ columnId: column.id, title: "Revisar" });
  let now = 100_000;
  const clock = () => now;
  const timer = createTimerStore(db, clock);
  const deletion = createTaskDeletionStore(db, clock);
  const start = async () => {
    expect(
      await timer.command({
        action: "start",
        taskId: task.id,
        version: (await timer.getState()).version,
      }),
    ).toMatchObject({ ok: true });
    now += 60_000;
  };
  return { db, board, task, timer, deletion, column, start };
}

test("preserva o período e encerra o cronômetro ao excluir uma Tarefa ativa", async () => {
  await withTask(async ({ board, task, timer, deletion, start }) => {
    await start();
    const before = (await timer.getState()).active!;
    const selection = {
      id: task.id,
      version: task.version,
      hours: "keep",
    } as const;
    const preview = await deletion.preview(selection);
    expect(preview.status).toBe("ready");
    if (preview.status !== "ready") throw new Error("Prévia indisponível.");
    expect(preview.records).toMatchObject([
      { id: before.id, endedAt: null, remove: false },
    ]);
    expect(
      await deletion.confirm({ ...selection, revision: preview.revision }),
    ).toEqual({ status: "deleted" });
    expect((await board.getBoard()).tasks).toEqual([]);
    const after = await timer.getState();
    expect(after.active).toBeNull();
    expect(after.records).toMatchObject([
      {
        ...before,
        taskId: null,
        taskTitle: null,
        endedAt: 160,
        version: before.version + 1,
      },
    ]);
  });
});

test("apaga somente períodos sem fatura válida e mantém intacta a fatura emitida", () =>
  withTask(async ({ db, task, timer, deletion, start }) => {
    const directory = createDirectoryStore(db);
    const owner = await directory.saveClient({
      name: "Oficina",
      legalName: "",
      address: "",
      taxId: "",
    });
    for (const [startedAt, endedAt] of [
      [10, 20],
      [20, 30],
      [30, 40],
    ]) {
      expect(
        await timer.saveRecord({
          startedAt,
          endedAt,
          description: "Revisão",
          taskId: task.id,
          projectId: null,
          clientId: owner.id,
        }),
      ).toMatchObject({ ok: true });
    }
    const [cancelledRecord, billedRecord] = (await timer.getState()).records;
    const [valid, cancelled] = await db
      .insert(invoice)
      .values([
        {
          clientId: owner.id,
          number: 1,
          language: "pt",
          currency: "BRL",
          issuedAt: 80,
          totalCents: 200,
        },
        {
          clientId: owner.id,
          number: 2,
          language: "pt",
          currency: "BRL",
          issuedAt: 90,
          cancelledAt: 95,
        },
      ])
      .returning();
    await db.insert(invoiceRecord).values([
      { invoiceId: valid.id, recordId: billedRecord.id },
      { invoiceId: cancelled.id, recordId: cancelledRecord.id },
      { invoiceId: cancelled.id, recordId: billedRecord.id },
    ]);
    await start();

    const selection = {
      id: task.id,
      version: task.version,
      hours: "remove",
    } as const;
    const preview = await deletion.preview(selection);
    if (preview.status !== "ready") throw new Error("Prévia indisponível.");
    expect(
      preview.records.map(({ startedAt, billed, remove }) => [
        startedAt,
        billed,
        remove,
      ]),
    ).toEqual([
      [10, false, true],
      [20, true, false],
      [30, false, true],
      [100, false, true],
    ]);
    expect(
      await deletion.confirm({ ...selection, revision: preview.revision }),
    ).toEqual({ status: "deleted" });
    const { records, active } = await timer.getState();
    expect(active).toBeNull();
    expect(records).toEqual([
      {
        ...billedRecord,
        taskId: null,
        taskTitle: null,
        version: billedRecord.version + 1,
      },
    ]);
    // Invoice issuance is not available yet, so fixture links stand in for issued invoices.
    expect(await db.select().from(invoice)).toEqual([valid, cancelled]);
    expect(await db.select().from(invoiceRecord)).toEqual([
      { invoiceId: valid.id, recordId: billedRecord.id },
      { invoiceId: cancelled.id, recordId: billedRecord.id },
    ]);
  }));

test("rejeita exclusão de Tarefa arquivada mesmo por chamada direta", () =>
  withTask(async ({ db, task, board, deletion }) => {
    const selection = {
      id: task.id,
      version: task.version,
      hours: "keep",
    } as const;
    const preview = await deletion.preview(selection);
    if (preview.status !== "ready") throw new Error("Prévia indisponível.");
    await createArchiveStore(db).change({
      kind: "task",
      action: "archive",
      id: task.id,
      version: task.version,
    });
    const [archived] = (await board.getBoard()).tasks;
    const current = { ...selection, version: archived.version };
    expect(await deletion.preview(current)).toEqual({ status: "archived" });
    expect(
      await deletion.confirm({ ...current, revision: preview.revision }),
    ).toEqual({ status: "archived" });
    expect((await board.getBoard()).tasks).toEqual([archived]);
  }));

test("reverte a parada do cronômetro e a remoção de horas se a exclusão falhar", () =>
  withTask(async ({ db, task, board, timer, deletion, start }) => {
    await start();
    const before = await timer.getState();
    const selection = {
      id: task.id,
      version: task.version,
      hours: "remove",
    } as const;
    const preview = await deletion.preview(selection);
    if (preview.status !== "ready") throw new Error("Prévia indisponível.");
    await db.run(sql`CREATE TRIGGER reject_task_delete BEFORE DELETE ON board_task
      BEGIN SELECT RAISE(ABORT, 'falha simulada'); END`);
    await expect(
      deletion.confirm({ ...selection, revision: preview.revision }),
    ).rejects.toThrow();
    expect(await timer.getState()).toEqual(before);
    expect((await board.getBoard()).tasks).toEqual([task]);
  }));

test("uma alteração feita por outra conexão invalida a confirmação anterior", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-task-deletion-"));
  const url = `file:${join(dir, "echo.db")}`;
  const first = await openDatabase(url);
  const second = await openDatabase(url);
  try {
    const { board, task, timer, deletion, start } = await setup(first.db);
    await start();
    const selection = {
      id: task.id,
      version: task.version,
      hours: "remove",
    } as const;
    const preview = await deletion.preview(selection);
    if (preview.status !== "ready") throw new Error("Prévia indisponível.");
    expect(
      await createTimerStore(second.db, () => 160_000).command({
        action: "stop",
        version: (await timer.getState()).version,
      }),
    ).toMatchObject({ ok: true });
    const before = await timer.getState();
    expect(
      await deletion.confirm({ ...selection, revision: preview.revision }),
    ).toEqual({ status: "conflict" });
    expect((await board.getBoard()).tasks).toEqual([task]);
    expect(await timer.getState()).toEqual(before);

    const updated = await deletion.preview(selection);
    if (updated.status !== "ready") throw new Error("Prévia indisponível.");
    const input = { ...selection, revision: updated.revision };
    const results = await Promise.all([
      deletion.confirm(input),
      createTaskDeletionStore(second.db).confirm(input),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([
      "conflict",
      "deleted",
    ]);
    expect((await board.getBoard()).tasks).toEqual([]);
    expect((await timer.getState()).records).toEqual([]);
  } finally {
    first.close();
    second.close();
    await rm(dir, { recursive: true, force: true });
  }
});
