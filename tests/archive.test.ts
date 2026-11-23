import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "../src/db/connection";
import { createDirectoryStore } from "../src/server/directory";
import { createTimerStore } from "../src/server/timer";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createArchiveStore } from "../src/server/archive";
import { createBoardStore } from "../src/server/board";

test("restaura uma Tarefa arquivada à sua coluna", async () => {
  const { db, close } = await openDatabase(":memory:");
  try {
    await migrateDatabase(db);
    const board = createBoardStore(db);
    const archive = createArchiveStore(db);
    const column = await board.saveColumn({ name: "Em andamento" });
    const task = await board.saveTask({
      columnId: column.id,
      title: "Revisar",
    });
    const target = { kind: "task", id: task.id, version: 1 } as const;
    expect(await archive.change({ ...target, action: "archive" })).toEqual({
      status: "saved",
    });
    expect((await board.getBoard()).tasks[0].archiveBatch).not.toBeNull();
    expect(
      await archive.change({ ...target, action: "restore", version: 2 }),
    ).toEqual({
      status: "saved",
    });
    expect((await board.getBoard()).tasks[0]).toMatchObject({
      id: task.id,
      columnId: column.id,
      archiveBatch: null,
    });
  } finally {
    close();
  }
});

async function withWork(
  run: (fixture: Awaited<ReturnType<typeof createWork>>) => Promise<void>,
) {
  const dir = await mkdtemp(join(tmpdir(), "echo-archive-"));
  const url = `file:${join(dir, "archive.db")}`;
  const first = await openDatabase(url);
  const second = await openDatabase(url);
  try {
    await migrateDatabase(first.db);
    await run(await createWork(first.db, second.db));
  } finally {
    first.close();
    second.close();
    await rm(dir, { recursive: true });
  }
}

async function createWork(db: Database, other: Database) {
  const board = createBoardStore(db);
  const directory = createDirectoryStore(db);
  const client = await directory.saveClient({
    name: "Oficina",
    legalName: "",
    taxId: "",
    address: "",
  });
  const makeProject = (name: string) =>
    directory.saveProject({
      name,
      clientId: client.id,
      hourlyRate: "120",
      currency: "BRL",
    });
  const project = await makeProject("Site");
  const sideProject = await makeProject("Aplicativo");
  const column = await board.saveColumn({ name: "Em andamento" });
  const makeTask = (title: string, projectId = project.id) =>
    board.saveTask({ columnId: column.id, title, projectId });
  const first = await makeTask("Revisar");
  const second = await makeTask("Publicar");
  const sideTask = await makeTask("Desenhar", sideProject.id);
  let now = 100_000;
  const clock = () => now;
  return {
    db,
    board,
    directory,
    archive: createArchiveStore(db, clock),
    remoteArchive: createArchiveStore(other, clock),
    timer: createTimerStore(other, clock),
    client,
    project,
    sideProject,
    first,
    second,
    sideTask,
    column,
    advance: () => {
      now += 60_000;
    },
  };
}

test("restaura apenas os Projetos e Tarefas arquivados junto com o Cliente", () =>
  withWork(
    async ({
      archive,
      directory,
      board,
      client,
      project,
      sideProject,
      first,
      second,
      sideTask,
    }) => {
      await archive.change({
        kind: "task",
        action: "archive",
        id: first.id,
        version: 1,
      });
      await archive.change({
        kind: "project",
        action: "archive",
        id: sideProject.id,
        version: 1,
      });
      await archive.change({
        kind: "client",
        action: "archive",
        id: client.id,
        version: 1,
      });
      expect(
        (await board.getBoard()).tasks.every(
          (task) => task.archiveBatch !== null,
        ),
      ).toBe(true);
      await expect(
        archive.change({
          kind: "task",
          action: "restore",
          id: second.id,
          version: 2,
        }),
      ).resolves.toMatchObject({
        status: "blocked",
        message: "Restaure o projeto antes da tarefa.",
      });
      await expect(
        archive.change({
          kind: "project",
          action: "restore",
          id: project.id,
          version: 2,
        }),
      ).resolves.toMatchObject({
        status: "blocked",
        message: "Restaure o cliente antes do projeto.",
      });

      await archive.change({
        kind: "client",
        action: "restore",
        id: client.id,
        version: 2,
      });
      expect(
        (await directory.listProjects())
          .filter((row) => row.archiveBatch === null)
          .map((row) => row.id),
      ).toEqual([project.id]);
      expect(
        (await board.getBoard()).tasks
          .filter((row) => row.archiveBatch === null)
          .map((row) => row.id),
      ).toEqual([second.id]);
      await archive.change({
        kind: "project",
        action: "restore",
        id: sideProject.id,
        version: 2,
      });
      expect(
        (await board.getBoard()).tasks
          .filter((row) => row.archiveBatch === null)
          .map((row) => row.id),
      ).toEqual([second.id, sideTask.id]);
    },
  ));

test("uma falha na cascata reverte o encerramento do período e todo o arquivamento", () =>
  withWork(
    async ({
      db,
      archive,
      directory,
      board,
      timer,
      client,
      first,
      advance,
    }) => {
      const target = {
        kind: "client",
        action: "archive",
        id: client.id,
        version: 1,
      } as const;
      await timer.command({ action: "start", taskId: first.id, version: 0 });
      const before = await timer.getState();
      const ask = await archive.change(target);
      expect(ask).toEqual({
        status: "confirmation-required",
        recordId: before.active!.id,
      });
      await db.run(
        "CREATE TRIGGER reject_archive BEFORE UPDATE OF archive_batch ON client BEGIN SELECT RAISE(ABORT, 'falha'); END",
      );
      advance();

      await expect(
        archive.change({ ...target, confirmedRecordId: before.active!.id }),
      ).rejects.toThrow();
      expect(await timer.getState()).toMatchObject({
        active: before.active,
        version: before.version,
      });
      expect((await directory.listClients())[0].archiveBatch).toBeNull();
      expect(
        (await directory.listProjects()).every(
          (row) => row.archiveBatch === null,
        ),
      ).toBe(true);
      expect(
        (await board.getBoard()).tasks.every(
          (row) => row.archiveBatch === null,
        ),
      ).toBe(true);

      await db.run("DROP TRIGGER reject_archive");
      await archive.change({ ...target, confirmedRecordId: before.active!.id });
      const stopped = await timer.getState();
      expect(stopped.active).toBeNull();
      expect(stopped.canResume).toBe(false);
      expect(stopped.records).toMatchObject([
        {
          id: before.active!.id,
          taskId: first.id,
          endedAt: 160,
          hourlyRateCents: 12000,
        },
      ]);
    },
  ));

test("uma troca concorrente exige confirmação para o novo período", () =>
  withWork(
    async ({
      archive,
      remoteArchive,
      timer,
      project,
      first,
      second,
      advance,
    }) => {
      const target = {
        kind: "project",
        action: "archive",
        id: project.id,
        version: 1,
      } as const;
      await timer.command({ action: "start", taskId: first.id, version: 0 });
      const firstPeriod = (await timer.getState()).active!;
      expect(await archive.change(target)).toEqual({
        status: "confirmation-required",
        recordId: firstPeriod.id,
      });
      advance();
      await timer.command({ action: "start", taskId: second.id, version: 1 });
      const secondPeriod = (await timer.getState()).active!;
      expect(
        await remoteArchive.change({
          ...target,
          confirmedRecordId: firstPeriod.id,
        }),
      ).toEqual({
        status: "confirmation-required",
        recordId: secondPeriod.id,
      });
      advance();
      await archive.change({ ...target, confirmedRecordId: secondPeriod.id });
      const stopped = await timer.getState();
      expect(stopped.active).toBeNull();
      expect(
        stopped.records.map(({ taskId, endedAt }) => [taskId, endedAt]),
      ).toEqual([
        [second.id, 220],
        [first.id, 160],
      ]);
      await expect(
        timer.command({
          action: "start",
          taskId: first.id,
          version: stopped.version,
        }),
      ).rejects.toThrow("arquivado");
    },
  ));

test("arquivamento e início simultâneos não deixam um cronômetro em Tarefa arquivada", () =>
  withWork(async ({ archive, board, timer, first }) => {
    const [archiveResult, startResult] = await Promise.allSettled([
      archive.change({
        kind: "task",
        action: "archive",
        id: first.id,
        version: 1,
      }),
      timer.command({ action: "start", taskId: first.id, version: 0 }),
    ]);
    const task = (await board.getBoard()).tasks.find(
      (row) => row.id === first.id,
    )!;
    const { active } = await timer.getState();
    if (task.archiveBatch !== null) {
      expect(archiveResult).toMatchObject({
        status: "fulfilled",
        value: { status: "saved" },
      });
      expect(active).toBeNull();
    } else {
      expect(startResult).toMatchObject({
        status: "fulfilled",
        value: { ok: true },
      });
      expect(active?.taskId).toBe(first.id);
    }
  }));

test("uma restauração desatualizada não desfaz um novo arquivamento", () =>
  withWork(async ({ archive, remoteArchive, board, project, column }) => {
    const target = { kind: "project", id: project.id } as const;
    await archive.change({ ...target, action: "archive", version: 1 });
    const staleRestore = { ...target, action: "restore", version: 2 } as const;
    await remoteArchive.change(staleRestore);
    const newTask = await board.saveTask({
      title: "Nova tarefa",
      columnId: column.id,
      projectId: project.id,
    });
    await remoteArchive.change({ ...target, action: "archive", version: 3 });
    expect(await archive.change(staleRestore)).toEqual({ status: "conflict" });
    expect(
      (await board.getBoard()).tasks.find((task) => task.id === newTask.id)
        ?.archiveBatch,
    ).toEqual(expect.any(String));
  }));
