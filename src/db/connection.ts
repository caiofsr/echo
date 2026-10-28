import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

const CAMINHO_LOCAL = /^(file:|:memory:)/;

export async function openDatabase(url: string): Promise<{
  db: Database;
  close: () => void;
}> {
  if (url !== ":memory:" && !/^(file:|https?:\/\/|libsql:\/\/)/.test(url))
    throw new Error(
      "DATABASE_URL deve usar file:, :memory:, http://, https:// ou libsql://.",
    );
  if (CAMINHO_LOCAL.test(url) && url !== ":memory:") {
    const filename = decodeURIComponent(url.slice(5).split("?")[0]);
    mkdirSync(dirname(filename), { recursive: true });
  }
  const client: Client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  await client.execute("PRAGMA foreign_keys = ON");
  if (CAMINHO_LOCAL.test(url))
    await client.execute("PRAGMA journal_mode = WAL");
  const db = drizzle(client, { schema });
  return { db, close: () => client.close() };
}

export function migrateDatabase(db: Database) {
  return migrate(db, { migrationsFolder: "./drizzle" });
}
