import { migrateDatabase, openDatabase } from "./connection";

const database = await openDatabase(
  process.env.DATABASE_URL ?? "file:.data/echo.db",
);
// Migração automática na inicialização do servidor; idempotente.
await migrateDatabase(database.db);

export const db = database.db;
export const closeDatabase = database.close;
