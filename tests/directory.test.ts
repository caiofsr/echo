import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createDirectoryStore } from "../src/server/directory";

const databases: Array<{ close: () => void; dir: string }> = [];
afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close();
    await rm(database.dir, { recursive: true, force: true });
  }
});
async function createStore() {
  const dir = await mkdtemp(join(tmpdir(), "echo-directory-"));
  const url = `file:${join(dir, "directory.db")}`;
  const database = await openDatabase(url);
  await migrateDatabase(database.db);
  databases.push({ ...database, dir });
  return { store: createDirectoryStore(database.db), url };
}
const clientInput = {
  name: "  Cliente Exemplo  ",
  legalName: "",
  taxId: "",
  address: "",
};

test("cadastra Cliente sem dados legais e consulta em outra conexão", async () => {
  const { store, url } = await createStore();
  expect(await store.listClients()).toEqual([]);
  const client = await store.saveClient(clientInput);
  const second = await openDatabase(url);
  try {
    expect(await createDirectoryStore(second.db).listClients()).toEqual([
      {
        id: client.id,
        version: 1,
        name: "Cliente Exemplo",
        legalName: null,
        taxId: null,
        address: null,
      },
    ]);
  } finally {
    second.close();
  }
});

test("edita os dados do Cliente e rejeita nome vazio ou cliente inexistente", async () => {
  const { store } = await createStore();
  await expect(
    store.saveClient({ ...clientInput, name: "  " }),
  ).rejects.toThrow("nome de exibição");
  const saved = await store.saveClient(clientInput);
  await store.saveClient({
    id: saved.id,
    version: saved.version,
    name: "Novo nome",
    legalName: " Razão Social ",
    taxId: " ID fiscal ",
    address: " Recife ",
  });
  expect(await store.listClients()).toEqual([
    {
      id: saved.id,
      version: 2,
      name: "Novo nome",
      legalName: "Razão Social",
      taxId: "ID fiscal",
      address: "Recife",
    },
  ]);
  await expect(
    store.saveClient({ ...clientInput, id: 999, version: 1 }),
  ).rejects.toThrow("Cliente alterado");
});

test("cria Projeto com valor exato em centavos e edita seu vínculo com um único Cliente", async () => {
  const { store, url } = await createStore();
  const first = await store.saveClient(clientInput);
  const second = await store.saveClient({
    ...clientInput,
    name: "Outro cliente",
  });
  const project = await store.saveProject({
    name: " Site ",
    clientId: first.id,
    hourlyRate: "120,35",
    currency: "BRL",
  });
  expect(await store.listProjects()).toEqual([
    {
      id: project.id,
      version: 1,
      name: "Site",
      clientId: first.id,
      hourlyRateCents: 12035,
      currency: "BRL",
    },
  ]);
  await store.saveProject({
    id: project.id,
    version: project.version,
    name: "Aplicativo",
    clientId: second.id,
    hourlyRate: "0.00",
    currency: "USD",
  });
  const connection = await openDatabase(url);
  try {
    expect(await createDirectoryStore(connection.db).listProjects()).toEqual([
      {
        id: project.id,
        version: 2,
        name: "Aplicativo",
        clientId: second.id,
        hourlyRateCents: 0,
        currency: "USD",
      },
    ]);
  } finally {
    connection.close();
  }
});

test("rejeita Projeto inválido sem alterar o cadastro existente", async () => {
  const { store } = await createStore();
  const client = await store.saveClient(clientInput);
  const input = {
    name: "Projeto",
    clientId: client.id,
    hourlyRate: "0.29",
    currency: "BRL" as const,
  };
  const saved = await store.saveProject(input);
  for (const hourlyRate of [
    "-1",
    "1.001",
    "NaN",
    "Infinity",
    "",
    "1e2",
    "90071992547409.92",
  ]) {
    await expect(
      store.saveProject({
        ...input,
        id: saved.id,
        version: saved.version,
        hourlyRate,
      }),
    ).rejects.toThrow();
  }
  await expect(store.saveProject({ ...input, clientId: 999 })).rejects.toThrow(
    "cliente cadastrado",
  );
  await expect(store.saveProject({ ...input, name: " " })).rejects.toThrow(
    "nome do projeto",
  );
  await expect(
    store.saveProject({ ...input, id: 999, version: 1 }),
  ).rejects.toThrow("Projeto alterado");
  expect(await store.listProjects()).toEqual([
    {
      id: saved.id,
      version: 1,
      name: "Projeto",
      clientId: client.id,
      hourlyRateCents: 29,
      currency: "BRL",
    },
  ]);
});

test("a primeira edição confirmada vence e a outra sessão recebe conflito", async () => {
  const { store, url } = await createStore();
  const client = await store.saveClient(clientInput);
  const projectInput = {
    name: "Projeto",
    clientId: client.id,
    hourlyRate: "10.00",
    currency: "BRL" as const,
  };
  const project = await store.saveProject(projectInput);
  const connection = await openDatabase(url);
  const other = createDirectoryStore(connection.db);
  try {
    const edits = await Promise.allSettled([
      store.saveClient({
        ...clientInput,
        id: client.id,
        version: client.version,
        name: "Primeiro nome",
      }),
      other.saveClient({
        ...clientInput,
        id: client.id,
        version: client.version,
        name: "Segundo nome",
      }),
    ]);
    expect(edits.filter((edit) => edit.status === "fulfilled")).toHaveLength(1);
    expect(edits.filter((edit) => edit.status === "rejected")).toHaveLength(1);
    await store.saveProject({
      ...projectInput,
      id: project.id,
      version: project.version,
      name: "Projeto atualizado",
    });
    await expect(
      other.saveProject({
        ...projectInput,
        id: project.id,
        version: project.version,
        name: "Nome antigo",
      }),
    ).rejects.toThrow("alterado em outra sessão");
    expect((await store.listProjects())[0].name).toBe("Projeto atualizado");
  } finally {
    connection.close();
  }
});

test("valor de hora alto mantém centavos na edição e exibição", async () => {
  const { hourlyRateInputValue, formatHourlyRate } =
    await import("../src/lib/directory-input");
  const { store } = await createStore();
  const client = await store.saveClient(clientInput);
  const project = await store.saveProject({
    name: "Projeto",
    clientId: client.id,
    hourlyRate: "90071992547409.90",
    currency: "BRL",
  });
  expect(hourlyRateInputValue(project.hourlyRateCents)).toBe(
    "90071992547409,90",
  );
  expect(formatHourlyRate(project.hourlyRateCents, "BRL")).toBe(
    "R$ 90.071.992.547.409,90",
  );
  const updated = await store.saveProject({
    id: project.id,
    version: project.version,
    name: "Novo nome",
    clientId: client.id,
    hourlyRate: hourlyRateInputValue(project.hourlyRateCents),
    currency: "BRL",
  });
  expect(updated.hourlyRateCents).toBe(9007199254740990);
});

test("valida tipos, identificadores e moeda na fronteira de entrada", async () => {
  const { parseClientInput, parseProjectInput } =
    await import("../src/lib/directory-input");
  for (const input of [
    null,
    [],
    {},
    { ...clientInput, id: 1 },
    { ...clientInput, id: -1, version: 1 },
    { ...clientInput, taxId: 42 },
  ]) {
    expect(() => parseClientInput(input)).toThrow();
  }
  for (const input of [
    null,
    { name: "Projeto", clientId: 1, hourlyRate: "10", currency: "EUR" },
    { name: "Projeto", clientId: 1.5, hourlyRate: "10", currency: "BRL" },
  ]) {
    expect(() => parseProjectInput(input)).toThrow();
  }
});
