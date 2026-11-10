import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createBoardStore } from "../src/server/board";
import { createDirectoryStore } from "../src/server/directory";
type DirectoryStore = ReturnType<typeof createDirectoryStore>;

const databases: Array<{ close: () => void; dir: string }> = [];
afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close();
    await rm(database.dir, { recursive: true, force: true });
  }
});
async function createStore() {
  const dir = await mkdtemp(join(tmpdir(), "echo-board-"));
  const url = `file:${join(dir, "board.db")}`;
  const database = await openDatabase(url);
  await migrateDatabase(database.db);
  databases.push({ ...database, dir });
  return {
    board: createBoardStore(database.db),
    directory: createDirectoryStore(database.db),
    url,
  };
}

async function newProject(directory: DirectoryStore, name: string) {
  const cliente = await directory.saveClient({
    name: `Cliente de ${name}`,
    legalName: "",
    taxId: "",
    address: "",
  });
  return directory.saveProject({
    name,
    clientId: cliente.id,
    hourlyRate: "10,00",
    currency: "BRL",
  });
}

test("cria Colunas na ordem recebida e consulta em outra conexão", async () => {
  const { board, url } = await createStore();
  expect(await board.getBoard()).toEqual({
    columns: [],
    tasks: [],
    projects: [],
  });
  const primeira = await board.saveColumn({ name: "  A fazer  " });
  const segunda = await board.saveColumn({ name: "Fazendo" });
  expect(primeira).toEqual({
    version: 1,
    id: primeira.id,
    name: "A fazer",
    position: 0,
  });
  expect(segunda.position).toBe(1);

  const other = await openDatabase(url);
  try {
    await expect(createBoardStore(other.db).getBoard()).resolves.toEqual({
      columns: [
        { version: 1, id: primeira.id, name: "A fazer", position: 0 },
        { version: 1, id: segunda.id, name: "Fazendo", position: 1 },
      ],
      tasks: [],
      projects: [],
    });
  } finally {
    other.close();
  }
});

test("renomeia Coluna com controle de versão e rejeita conflito ou inexistente", async () => {
  const { board } = await createStore();
  const coluna = await board.saveColumn({ name: "A fazer" });
  await expect(
    board.saveColumn({ id: coluna.id, version: coluna.version, name: "  " }),
  ).rejects.toThrow("nome da coluna");
  const renamed = await board.saveColumn({
    id: coluna.id,
    version: coluna.version,
    name: " Para fazer ",
  });
  expect(renamed).toEqual({
    version: 2,
    id: coluna.id,
    name: "Para fazer",
    position: 0,
  });
  await expect(
    board.saveColumn({ id: 999, version: 1, name: "Fantasma" }),
  ).rejects.toThrow("Coluna alterada");
});

test("remove Coluna vazia e exige mover as Tarefas da Coluna ocupada", async () => {
  const { board, directory, url } = await createStore();
  await newProject(directory, "Site");
  const destino = await board.saveColumn({ name: "A fazer" });
  const coluna = await board.saveColumn({ name: "Fazendo" });
  const tarefa = await board.saveTask({
    title: "Revisar texto",
    description: "",
    columnId: coluna.id,
  });
  await expect(board.removeColumn(coluna.id)).rejects.toThrow(
    "Mova as tarefas para outra coluna antes de removê-la.",
  );
  const vazia = await board.saveColumn({ name: "Descartada" });
  await board.removeColumn(vazia.id);
  await board.moveTask({
    taskId: tarefa.id,
    columnId: destino.id,
    position: 0,
  });
  await board.removeColumn(coluna.id);
  const boardAfter = await board.getBoard();
  expect(boardAfter.columns).toHaveLength(1);
  expect(boardAfter.tasks).toEqual([
    {
      version: 1,
      id: tarefa.id,
      title: "Revisar texto",
      description: null,
      projectId: null,
      columnId: destino.id,
      position: 0,
    },
  ]);
  const other = await openDatabase(url);
  try {
    expect((await createBoardStore(other.db).getBoard()).columns).toHaveLength(
      1,
    );
  } finally {
    other.close();
  }
});

test("reordena Colunas por lista completa e rejeita listas inválidas", async () => {
  const { board } = await createStore();
  const a = await board.saveColumn({ name: "A" });
  const b = await board.saveColumn({ name: "B" });
  const c = await board.saveColumn({ name: "C" });
  await expect(board.reorderColumns([a.id, b.id])).rejects.toThrow(
    "Sequência de colunas inválida. Atualize o quadro e tente novamente.",
  );
  await expect(board.reorderColumns([b.id, b.id, a.id, c.id])).rejects.toThrow(
    "Sequência de colunas inválida",
  );
  await expect(board.reorderColumns([a.id, b.id, 999])).rejects.toThrow(
    "Sequência de colunas inválida",
  );
  await board.reorderColumns([c.id, b.id, a.id]);
  expect(
    (await board.getBoard()).columns.map((column) => ({
      name: column.name,
      position: column.position,
    })),
  ).toEqual([
    { name: "C", position: 0 },
    { name: "B", position: 1 },
    { name: "A", position: 2 },
  ]);
});

test("cria Tarefa posicionada, edita texto e vínculo de Projeto", async () => {
  const { board, directory } = await createStore();
  const projeto = await newProject(directory, "Site");
  const coluna = await board.saveColumn({ name: "A fazer" });
  const primeira = await board.saveTask({
    title: "  Escrever proposta  ",
    description: "  Sobre a reunião de alinhamento  ",
    columnId: coluna.id,
  });
  expect(primeira).toEqual({
    version: 1,
    id: primeira.id,
    title: "Escrever proposta",
    description: "Sobre a reunião de alinhamento",
    projectId: null,
    columnId: coluna.id,
    position: 0,
  });
  const segunda = await board.saveTask({
    title: "Segunda tarefa",
    description: "",
    columnId: coluna.id,
  });
  expect(segunda.position).toBe(1);
  const edited = await board.saveTask({
    id: primeira.id,
    version: primeira.version,
    title: "Escrever proposta final",
    description: "",
    projectId: projeto.id,
    columnId: coluna.id,
  });
  expect(edited).toEqual({
    version: 2,
    id: primeira.id,
    title: "Escrever proposta final",
    description: null,
    projectId: projeto.id,
    columnId: coluna.id,
    position: 0,
  });
  const detached = await board.saveTask({
    id: primeira.id,
    version: edited.version,
    title: "Escrever proposta final",
    description: "",
    projectId: null,
    columnId: coluna.id,
  });
  expect(detached.projectId).toBeNull();
  expect(
    (await board.getBoard()).tasks.map((task) => [task.title, task.position]),
  ).toEqual([
    ["Escrever proposta final", 0],
    ["Segunda tarefa", 1],
  ]);
});

test("rejeita Tarefa inválida ou referências inexistentes", async () => {
  const { board, directory } = await createStore();
  await newProject(directory, "Aplicativo");
  const coluna = await board.saveColumn({ name: "A fazer" });
  const input = { title: "Tarefa", description: "", columnId: coluna.id };
  const saved = await board.saveTask(input);
  await expect(board.saveTask({ ...input, title: "  " })).rejects.toThrow(
    "título da tarefa",
  );
  await expect(board.saveTask({ ...input, columnId: 999 })).rejects.toThrow(
    "Escolha uma coluna cadastrada.",
  );
  await expect(board.saveTask({ ...input, projectId: 999 })).rejects.toThrow(
    "Escolha um projeto cadastrado.",
  );
  await expect(
    board.saveTask({ ...input, id: saved.id, version: 999 }),
  ).rejects.toThrow("Tarefa alterada");
  const boardAfter = await board.getBoard();
  expect(boardAfter.tasks).toEqual([
    {
      version: 1,
      id: saved.id,
      title: "Tarefa",
      description: null,
      projectId: null,
      columnId: coluna.id,
      position: 0,
    },
  ]);
});

test("move Tarefa dentro da Coluna e entre Colunas compactando posições", async () => {
  const { board, directory } = await createStore();
  const projeto = await newProject(directory, "Site");
  const origem = await board.saveColumn({ name: "Origem" });
  const destino = await board.saveColumn({ name: "Destino" });
  const criar = (title: string) =>
    board.saveTask({
      title,
      description: "",
      projectId: projeto.id,
      columnId: origem.id,
    });
  const t1 = await criar("Uma");
  const t2 = await criar("Dois");
  await criar("Três");

  await board.moveTask({ taskId: t1.id, columnId: origem.id, position: 2 });
  expect(
    (await board.getBoard()).tasks.map((task) => [
      task.title,
      task.columnId,
      task.position,
    ]),
  ).toEqual([
    ["Dois", origem.id, 0],
    ["Três", origem.id, 1],
    ["Uma", origem.id, 2],
  ]);

  await board.moveTask({ taskId: t2.id, columnId: destino.id, position: 0 });
  expect(
    (await board.getBoard()).tasks.map((task) => [
      task.title,
      task.columnId,
      task.position,
    ]),
  ).toEqual([
    ["Três", origem.id, 0],
    ["Uma", origem.id, 1],
    ["Dois", destino.id, 0],
  ]);

  await board.moveTask({ taskId: t2.id, columnId: origem.id, position: 999 });
  expect(
    (await board.getBoard()).tasks
      .filter((task) => task.columnId === origem.id)
      .map((task) => [task.title, task.position]),
  ).toEqual([
    ["Três", 0],
    ["Uma", 1],
    ["Dois", 2],
  ]);

  await expect(
    board.moveTask({ taskId: 999, columnId: origem.id, position: 0 }),
  ).rejects.toThrow(
    "Tarefa não encontrada. Atualize o quadro e tente novamente.",
  );
});

test("valida tipos e identificadores na fronteira de entrada", async () => {
  const { parseColumnInput, parseTaskInput, parseColumnOrderInput } =
    await import("../src/lib/board-input");
  for (const input of [
    null,
    [],
    { name: "Coluna", id: 1 },
    { name: "Coluna", id: 1.5, version: 1 },
    { name: 42 },
  ]) {
    expect(() => parseColumnInput(input)).toThrow();
  }
  for (const input of [
    null,
    [],
    { title: "Tarefa", columnId: "um" },
    { title: "Tarefa", columnId: 1, projectId: 2.5 },
  ]) {
    expect(() => parseTaskInput(input)).toThrow();
  }
  for (const input of [null, [], { columns: "" }, { columns: [0] }]) {
    expect(() => parseColumnOrderInput(input)).toThrow();
  }
});
