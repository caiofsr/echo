import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export function openDatabase(url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });
  return { db, close: () => client.close() };
}
export type Database = ReturnType<typeof openDatabase>["db"];
export async function migrateDatabase(db: Database) {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
