import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createSettingsStore } from "../src/server/settings";
import { companySettings } from "../src/db/schema";

const databases: Array<{
  close: () => void;
  dir: string;
}> = [];

afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close();
    await rm(database.dir, { recursive: true, force: true });
  }
});

async function createStore() {
  const dir = await mkdtemp(join(tmpdir(), "echo-settings-"));
  const url = `file:${join(dir, "settings.db")}`;
  const database = await openDatabase(url);
  await migrateDatabase(database.db);
  const tracked = { dir, close: database.close };
  databases.push(tracked);
  return {
    dir,
    url,
    db: database.db,
    store: createSettingsStore(database.db),
    close: () => {
      tracked.close();
      databases.splice(databases.indexOf(tracked), 1);
    },
  };
}

test("empresa começa vazia e salva dados opcionais sem padrões fictícios", async () => {
  const { store } = await createStore();

  expect(await store.listCompanies()).toEqual([]);
  await expect(
    store.createCompany({ name: "   ", taxId: "", address: "", phone: "" }),
  ).rejects.toThrow("Informe o nome ou a razão social.");

  const created = await store.createCompany({
    name: "  Echo Studio  ",
    taxId: "",
    address: " Rua das Flores, 10 ",
    phone: "",
  });
  expect(created).toEqual({
    id: expect.any(String),
    name: "Echo Studio",
    taxId: null,
    address: "Rua das Flores, 10",
    phone: null,
  });
});

test("empresa existente é preservada ao criar e editar outras empresas", async () => {
  const { db, store } = await createStore();
  await db.insert(companySettings).values({
    id: "owner",
    name: "Empresa anterior",
    taxId: null,
    address: null,
    phone: null,
  });
  const other = await store.createCompany({
    name: "Outra empresa",
    taxId: "",
    address: "",
    phone: "",
  });
  await store.updateCompany("owner", {
    name: "Empresa atualizada",
    taxId: "",
    address: "",
    phone: "",
  });
  expect(await store.listCompanies()).toEqual([
    {
      id: "owner",
      name: "Empresa atualizada",
      taxId: null,
      address: null,
      phone: null,
    },
    other,
  ]);
  await expect(
    store.updateCompany("missing", {
      name: "Inexistente",
      taxId: "",
      address: "",
      phone: "",
    }),
  ).rejects.toThrow("Empresa não encontrada.");
});

test("empresa e conjuntos de pagamento permanecem após reabrir o SQLite", async () => {
  const { dir, url, store, close } = await createStore();
  await store.createCompany({
    name: "Echo Studio",
    taxId: "12.345.678/0001-90",
    address: "Rua das Flores, 10",
    phone: "+55 81 99999-0000",
  });
  const first = await store.createPaymentMethod({
    label: "Transferência",
    instructions: "Banco 000 · Agência 123 · Conta 456",
  });
  const second = await store.createPaymentMethod({
    label: "PIX",
    instructions: "Chave: cobranca@example.invalid",
  });
  close();

  const reopened = await openDatabase(url);
  try {
    const persisted = createSettingsStore(reopened.db);
    expect(await persisted.listCompanies()).toEqual([
      {
        id: expect.any(String),
        name: "Echo Studio",
        taxId: "12.345.678/0001-90",
        address: "Rua das Flores, 10",
        phone: "+55 81 99999-0000",
      },
    ]);
    expect(await persisted.listPaymentMethods()).toEqual([first, second]);
  } finally {
    reopened.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("conjuntos de pagamento exigem rótulo e instruções e podem ser editados", async () => {
  const { store } = await createStore();
  await expect(
    store.createPaymentMethod({ label: " ", instructions: "Conta 123" }),
  ).rejects.toThrow("Informe um rótulo.");
  await expect(
    store.createPaymentMethod({ label: "PIX", instructions: "  " }),
  ).rejects.toThrow("Informe as instruções de recebimento.");

  const paymentMethod = await store.createPaymentMethod({
    label: "PIX",
    instructions: "Chave aleatória",
  });
  expect(
    await store.updatePaymentMethod(paymentMethod.id, {
      label: "  PIX comercial ",
      instructions: "  Chave: 00000000-0000  ",
    }),
  ).toEqual({
    id: paymentMethod.id,
    archived: false,
    label: "PIX comercial",
    instructions: "Chave: 00000000-0000",
  });
  await expect(
    store.updatePaymentMethod(99999, {
      label: "PIX",
      instructions: "Chave aleatória",
    }),
  ).rejects.toThrow("Forma de recebimento não encontrada.");
});

test("formas arquivadas são preservadas, excluídas das opções ativas e podem ser restauradas", async () => {
  const { store } = await createStore();
  const pix = await store.createPaymentMethod({
    label: "PIX",
    instructions: "Chave",
  });
  const archived = await store.setPaymentMethodArchived(pix.id, true);
  expect(archived.archived).toBe(true);
  expect(await store.listActivePaymentMethods()).toEqual([]);
  expect(await store.listPaymentMethods()).toEqual([archived]);
  expect((await store.setPaymentMethodArchived(pix.id, false)).archived).toBe(
    false,
  );
  expect(await store.listActivePaymentMethods()).toEqual([pix]);
});
