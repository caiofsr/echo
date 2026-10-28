import { openDatabase } from "./connection";

export const { db, close: closeDatabase } = openDatabase(
  process.env.DATABASE_URL ?? "file:.data/echo.db",
);
