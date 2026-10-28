import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

export async function openDatabase(url: string): Promise<{
  db: Database;
  close: () => void;
}> {
  // Conexões locais são arquivos ou memória; as demais precisam de um
  // endpoint de serviço libSQL explícito.
  const local = url === ":memory:" || url.startsWith("file:");
  if (!local && !/^(https?:\/\/|libsql:\/\/)/.test(url))
    throw new Error(
      "DATABASE_URL deve usar file:, :memory:, http://, https:// ou libsql://.",
    );
  if (local && url !== ":memory:") {
    const filename = decodeURIComponent(url.slice(5).split("?")[0]);
    mkdirSync(dirname(filename), { recursive: true });
  }
  const client: Client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  await client.execute("PRAGMA foreign_keys = ON");
  // O servidor libSQL é sempre WAL e rejeita o pragma sobre HTTP, então o
  // journal_mode só se aplica a conexões locais.
  if (local) await client.execute("PRAGMA journal_mode = WAL");
  const db = drizzle(client, { schema });
  return { db, close: () => client.close() };
}

export function migrateDatabase(db: Database) {
  return migrate(db, { migrationsFolder: "./drizzle" });
}
