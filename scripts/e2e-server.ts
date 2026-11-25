import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { openDatabase, migrateDatabase } from "../src/db/connection";
import { createAccess } from "../tests/helpers/create-access";
import {
  client,
  project,
  companySettings,
  paymentMethod,
  rateLimit,
  boardColumn,
  boardTask,
  timeRecord,
  timerPreferences,
  invoice,
  invoiceRecord,
} from "../src/db/schema";

const dir = await mkdtemp(join(tmpdir(), "echo-browser-"));
process.env.DATABASE_URL = `file:${join(dir, "browser.db")}`;
const database = await openDatabase(process.env.DATABASE_URL);
await migrateDatabase(database.db);
await createAccess(database.db, {
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
}).setPassword("senha pessoal de teste no navegador");

const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);

type SeedRecord = {
  startedAt: string;
  endedAt: string | null;
  description: string;
  projectId: number | null;
  clientId: number | null;
  hourlyRateCents: number;
  currency: "BRL" | "USD";
};

function seedRecord(values: SeedRecord) {
  return database.db
    .insert(timeRecord)
    .values({
      manual: true,
      description: values.description,
      startedAt: seconds(values.startedAt),
      endedAt: values.endedAt === null ? null : seconds(values.endedAt),
      projectId: values.projectId,
      clientId: values.clientId,
      hourlyRateCents: values.hourlyRateCents,
      currency: values.currency,
    })
    .returning();
}

// A deterministic April 2020 history for invoice previews: one hour per
// project, records on both period borders, a free record, an active timer and
// a record already linked to a valid invoice.
async function seedInvoices() {
  await database.db.delete(invoiceRecord).run();
  await database.db.delete(invoice).run();
  await database.db.delete(timeRecord).run();
  await database.db.delete(boardTask).run();
  await database.db.delete(boardColumn).run();
  await database.db.delete(project).run();
  await database.db.delete(client).run();
  await database.db.delete(paymentMethod).run();
  await database.db.delete(companySettings).run();
  await database.db.delete(rateLimit).run();
  await database.db
    .update(timerPreferences)
    .set({ hourlyRateCents: 0, currency: "BRL", timezone: "America/Recife" })
    .where(eq(timerPreferences.id, 1));
  await database.db
    .insert(companySettings)
    .values({ id: "owner", name: "Ateliê Aurora" });
  await database.db.insert(paymentMethod).values({
    label: "Pix",
    instructions: "Pix para fatura@aurora.test\nBanco Aurora · Agência 0001",
  });
  const [owner] = await database.db
    .insert(client)
    .values({ name: "Oficina Aurora" })
    .returning();
  const [identity] = await database.db
    .insert(project)
    .values({
      name: "Identidade",
      clientId: owner.id,
      hourlyRateCents: 10000,
      currency: "BRL",
    })
    .returning();
  const [website] = await database.db
    .insert(project)
    .values({
      name: "Website",
      clientId: owner.id,
      hourlyRateCents: 6000,
      currency: "USD",
    })
    .returning();
  const [column] = await database.db
    .insert(boardColumn)
    .values({ name: "Fazendo", position: 0 })
    .returning();
  const [billedTask] = await database.db
    .insert(boardTask)
    .values({
      title: "Tarefa faturada",
      description: "Manter o histórico da fatura",
      projectId: identity.id,
      columnId: column.id,
      position: 0,
    })
    .returning();

  const [invoiced] = await seedRecord({
    startedAt: "2020-04-15T12:00:00Z",
    endedAt: "2020-04-15T13:00:00Z",
    description: "Rascunho já faturado",
    projectId: identity.id,
    clientId: owner.id,
    hourlyRateCents: 10000,
    currency: "BRL",
  });
  const [taskRecord] = await seedRecord({
    startedAt: "2020-04-10T12:00:00Z",
    endedAt: "2020-04-10T13:00:00Z",
    description: "Pesquisa de identidade",
    projectId: identity.id,
    clientId: owner.id,
    hourlyRateCents: 10000,
    currency: "BRL",
  });
  await database.db
    .update(timeRecord)
    .set({ taskId: billedTask.id })
    .where(eq(timeRecord.id, taskRecord.id));
  await seedRecord({
    startedAt: "2020-04-11T12:00:00Z",
    endedAt: "2020-04-11T13:00:00Z",
    description: "Implementação do site",
    projectId: website.id,
    clientId: owner.id,
    hourlyRateCents: 6000,
    currency: "USD",
  });
  await seedRecord({
    startedAt: "2020-04-12T12:00:00Z",
    endedAt: "2020-04-12T13:00:00Z",
    description: "Estudo sem projeto",
    projectId: null,
    clientId: owner.id,
    hourlyRateCents: 0,
    currency: "BRL",
  });
  await seedRecord({
    startedAt: "2020-04-01T02:30:00Z",
    endedAt: "2020-04-01T03:30:00Z",
    description: "Atravessa o início",
    projectId: identity.id,
    clientId: owner.id,
    hourlyRateCents: 10000,
    currency: "BRL",
  });
  await seedRecord({
    startedAt: "2020-05-01T02:30:00Z",
    endedAt: "2020-05-01T03:30:00Z",
    description: "Atravessa o fim",
    projectId: identity.id,
    clientId: owner.id,
    hourlyRateCents: 10000,
    currency: "BRL",
  });
  await seedRecord({
    startedAt: "2020-04-20T12:00:00Z",
    endedAt: null,
    description: "Sessão em andamento",
    projectId: identity.id,
    clientId: owner.id,
    hourlyRateCents: 10000,
    currency: "BRL",
  });

  const [issued] = await database.db
    .insert(invoice)
    .values({
      clientId: owner.id,
      number: 1,
      language: "pt",
      currency: "BRL",
      totalCents: 10000,
      periodFrom: "2020-04-01",
      periodTo: "2020-04-30",
      timezone: "America/Recife",
      clientSnapshot: JSON.stringify({
        name: owner.name,
        legalName: null,
        taxId: null,
        address: null,
      }),
      companySnapshot: JSON.stringify({
        name: "Ateliê Aurora",
        taxId: null,
        address: null,
        phone: null,
      }),
      paymentSnapshot: JSON.stringify({
        label: "Pix",
        instructions:
          "Pix para fatura@aurora.test\nBanco Aurora · Agência 0001",
      }),
      linesSnapshot: JSON.stringify([
        {
          projectId: identity.id,
          projectName: "Identidade",
          serviceDescription: "Identidade",
          hoursSeconds: 3600,
          subtotalCents: 10000,
          rateCents: 10000,
          rateCurrency: "BRL",
          recordIds: [invoiced.id],
        },
      ]),
      issuedAt: seconds("2020-05-02T12:00:00Z"),
    })
    .returning();
  await database.db
    .insert(invoiceRecord)
    .values({ invoiceId: issued.id, recordId: invoiced.id });
}

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
        if (path === "/seed-invoices") {
          await seedInvoices();
          return new Response(null, { status: 204 });
        }
        if (path === "/reset-directory") {
          await database.db.delete(invoiceRecord).run();
          await database.db.delete(invoice).run();
          await database.db.delete(timeRecord).run();
          await database.db.delete(boardTask).run();
          await database.db.delete(project).run();
          await database.db.delete(client).run();
          return new Response(null, { status: 204 });
        }
        if (path === "/reset-board") {
          await database.db.delete(invoiceRecord).run();
          await database.db.delete(invoice).run();
          await database.db.delete(timeRecord).run();
          await database.db.delete(boardTask).run();
          await database.db.delete(boardColumn).run();
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
