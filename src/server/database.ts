import { Database as BunSQLite } from "bun:sqlite";
import { createClient } from "@libsql/client";
import { drizzle as bunDrizzle } from "drizzle-orm/bun-sqlite";
import { migrate as bunMigrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle as libsqlDrizzle } from "drizzle-orm/libsql";
import { migrate as libsqlMigrate } from "drizzle-orm/libsql/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

export type Database = BaseSQLiteDatabase<
  "sync" | "async",
  unknown,
  typeof schema
>;
const migrations = new WeakMap<Database, () => void | Promise<void>>();
const localDatabases = new WeakSet<Database>();

export function openDatabase(
  url: string,
  authToken?: string,
): {
  db: Database;
  close: () => void;
} {
  if (url.startsWith("file:") || url === ":memory:") {
    const filename =
      url === ":memory:" ? url : decodeURIComponent(url.slice(5));
    const client = new BunSQLite(filename, { create: true });
    client.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    const db = bunDrizzle(client, { schema });
    localDatabases.add(db);
    migrations.set(db, () => bunMigrate(db, { migrationsFolder: "./drizzle" }));
    return { db, close: () => client.close() };
  }
  if (!url.startsWith("libsql://"))
    throw new Error(
      "DATABASE_URL deve usar file: para SQLite ou libsql:// para Turso.",
    );
  const client = createClient({ url, authToken });
  const db = libsqlDrizzle(client, { schema });
  migrations.set(db, () =>
    libsqlMigrate(db, { migrationsFolder: "./drizzle" }),
  );
  return { db, close: () => client.close() };
}
export async function migrateDatabase(db: Database) {
  const migrate = migrations.get(db);
  if (!migrate) throw new Error("Banco não aberto por openDatabase.");
  await migrate();
}

// Bun's SQLite transactions must finish synchronously. Build the same write
// operations for both drivers, without awaiting inside the native transaction.
export async function atomicWrites(
  db: Database,
  create: (tx: Database) => { run(): unknown }[],
) {
  if (localDatabases.has(db)) {
    db.transaction((tx) => {
      for (const query of create(tx)) query.run();
    });
  } else {
    await db.transaction(async (tx) => {
      for (const query of create(tx)) await query.run();
    });
  }
}
