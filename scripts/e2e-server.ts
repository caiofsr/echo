import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase, migrateDatabase } from "../src/server/database";
import { createAccess } from "../src/server/access";
import { rateLimit } from "../src/server/schema";
const dir = await mkdtemp(join(tmpdir(), "echo-browser-"));
process.env.DATABASE_URL = `file:${join(dir, "browser.db")}`;
const database = openDatabase(process.env.DATABASE_URL);
await migrateDatabase(database.db);
await createAccess(database.db, {
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  secureCookies: false,
}).setPassword("senha pessoal de teste no navegador");
const control = process.env.ECHO_TEST_CONTROL_PORT
  ? Bun.serve({
      hostname: "127.0.0.1",
      port: Number(process.env.ECHO_TEST_CONTROL_PORT),
      async fetch(request) {
        if (request.method !== "POST")
          return new Response(null, { status: 404 });
        const path = new URL(request.url).pathname;
        if (path === "/reset-rate-limit") {
          database.db.delete(rateLimit).run();
          return new Response(null, { status: 204 });
        }
        if (path !== "/reset-password")
          return new Response(null, { status: 404 });
        await createAccess(database.db, {
          baseURL: process.env.BETTER_AUTH_URL!,
          secret: process.env.BETTER_AUTH_SECRET!,
          secureCookies: false,
        }).setPassword("senha pessoal de teste no navegador");
        return new Response(null, { status: 204 });
      },
    })
  : undefined;
const child = Bun.spawn(["bun", "server.ts"], {
  env: process.env,
  stdout: "inherit",
  stderr: "inherit",
});
async function stop() {
  control?.stop();
  database.close();
  child.kill();
  await child.exited;
  await rm(dir, { recursive: true, force: true });
  process.exit();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
await child.exited;
control?.stop();
database.close();
await rm(dir, { recursive: true, force: true });
