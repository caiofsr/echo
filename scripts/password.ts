import { openDatabase } from "../src/server/database";
import { createAccess } from "../src/server/access";
import { readEnvironment } from "../src/server/runtime";

// Passwords arrive via stdin, never a command-line argument or versioned seed.
const input = await Bun.stdin.text();
const password = input.replace(/\r?\n$/, "");
const env = readEnvironment();
const database = openDatabase(env.url);
try {
  await createAccess(database.db, env).setPassword(password);
  console.log("Senha definida. Todas as sessões anteriores foram encerradas.");
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Não foi possível definir a senha.",
  );
  process.exitCode = 1;
} finally {
  database.close();
}
