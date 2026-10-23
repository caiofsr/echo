import { openDatabase, migrateDatabase } from "../src/server/database";
import { readEnvironment } from "../src/server/runtime";
const env = readEnvironment();
const database = openDatabase(env.url);
try {
  await migrateDatabase(database.db);
  console.log("Migrações aplicadas.");
} finally {
  database.close();
}
