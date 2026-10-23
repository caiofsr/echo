import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database as BunSQLite } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

export type Database = BunSQLiteDatabase<typeof schema>;

export function openDatabase(url: string): {
  db: Database;
  close: () => void;
} {
  if (!url.startsWith("file:") && url !== ":memory:")
    throw new Error("DATABASE_URL deve usar file: para SQLite local.");
  const filename = url === ":memory:" ? url : decodeURIComponent(url.slice(5));
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const client = new BunSQLite(filename, { create: true });
  client.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const db = drizzle(client, { schema });
  return { db, close: () => client.close() };
}

export function migrateDatabase(db: Database) {
  migrate(db, { migrationsFolder: "./drizzle" });
}
