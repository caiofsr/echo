import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase, migrateDatabase } from "../src/db/connection";
import { createAccess } from "../tests/helpers/create-access";
import { companySettings, paymentMethod, rateLimit } from "../src/db/schema";

const dir = await mkdtemp(join(tmpdir(), "echo-browser-"));
process.env.DATABASE_URL = `file:${join(dir, "browser.db")}`;
const database = await openDatabase(process.env.DATABASE_URL);
await migrateDatabase(database.db);
await createAccess(database.db, {
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
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
          await database.db.delete(rateLimit).run();
          return new Response(null, { status: 204 });
        }
        if (path === "/reset-settings") {
          await database.db.delete(paymentMethod).run();
          await database.db.delete(companySettings).run();
          return new Response(null, { status: 204 });
        }
        if (path !== "/reset-password")
          return new Response(null, { status: 404 });
        await createAccess(database.db, {
          baseURL: process.env.BETTER_AUTH_URL!,
          secret: process.env.BETTER_AUTH_SECRET!,
        }).setPassword("senha pessoal de teste no navegador");
        return new Response(null, { status: 204 });
      },
    })
  : undefined;
const harness = await Bun.build({
  entrypoints: ["./e2e/fixtures/session-harness.tsx"],
  outdir: "dist/client/__tests__",
  target: "browser",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
if (!harness.success)
  throw new AggregateError(harness.logs, "Session harness build failed");
await Bun.write(
  "dist/client/__tests__/session.html",
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Session test</title></head><body><div id="root"></div><script type="module" src="/__tests__/session-harness.js"></script></body></html>`,
);
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
  await rm("dist/client/__tests__", { recursive: true, force: true });
  await rm(dir, { recursive: true, force: true });
  process.exit();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
await child.exited;
control?.stop();
database.close();
await rm("dist/client/__tests__", { recursive: true, force: true });
await rm(dir, { recursive: true, force: true });
