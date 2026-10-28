import { db, closeDatabase } from "../src/db";
import { migrateDatabase } from "../src/db/connection";

try {
  await migrateDatabase(db);
  console.log("Migrações aplicadas.");
} finally {
  closeDatabase();
}
