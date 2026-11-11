import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDatabase, openDatabase } from "../src/db/connection";
import { createTimerStore } from "../src/server/timer";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "echo-timer-"));
  const url = `file:${join(dir, "timer.db")}`;
  const a = await openDatabase(url);
  await migrateDatabase(a.db);
  const b = await openDatabase(url);
  cleanup.push(async () => {
    a.close();
    b.close();
    await rm(dir, { recursive: true });
  });
  let now = 100_900;
  return {
    a: createTimerStore(a.db, () => now),
    b: createTimerStore(b.db, () => now),
    clock: (value: number) => {
      now = value;
    },
  };
}
test("persiste início entre conexões, encerra em segundos e retoma sem a pausa", async () => {
  const { a, b, clock } = await setup();
  expect((await a.getState()).preferences.timezone).toBe("America/Recife");
  await a.savePreferences({
    hourlyRateCents: 12500,
    currency: "USD",
    timezone: "UTC",
  });
  expect((await a.command({ action: "start", version: 0 })).ok).toBe(true);
  expect((await b.getState()).active?.startedAt).toBe(100);
  clock(165_800);
  await b.command({ action: "stop", version: 1 });
  expect((await a.getState()).records[0]).toMatchObject({
    startedAt: 100,
    endedAt: 165,
    hourlyRateCents: 12500,
    currency: "USD",
  });
  await a.savePreferences({
    hourlyRateCents: 5000,
    currency: "BRL",
    timezone: "America/Recife",
  });
  clock(300_000);
  await a.command({ action: "resume", version: 2 });
  clock(330_000);
  await a.command({ action: "stop", version: 3 });
  const state = await b.getState();
  expect(state.records.map((r) => [r.startedAt, r.endedAt])).toEqual([
    [300, 330],
    [100, 165],
  ]);
  expect(state.records[1].hourlyRateCents).toBe(12500);
  expect(state.records[0].hourlyRateCents).toBe(5000);
});

test("disputas de início e parada têm um vencedor e comandos antigos não afetam novo período", async () => {
  const { a, b, clock } = await setup();
  const starts = await Promise.all([
    a.command({ action: "start", version: 0 }),
    b.command({ action: "start", version: 0 }),
  ]);
  expect(starts.filter((r) => r.ok)).toHaveLength(1);
  expect((await a.getState()).records).toHaveLength(1);
  clock(120_000);
  const stops = await Promise.all([
    a.command({ action: "stop", version: 1 }),
    b.command({ action: "stop", version: 1 }),
  ]);
  expect(stops.filter((r) => r.ok)).toHaveLength(1);
  clock(150_000);
  await b.command({ action: "resume", version: 2 });
  expect((await a.command({ action: "stop", version: 1 })).ok).toBe(false);
  expect((await b.getState()).active?.startedAt).toBe(150);
});

test("rejeita entradas inválidas e relógio regressivo sem perder o período ativo", async () => {
  const { a, clock } = await setup();
  await expect(
    a.savePreferences({
      hourlyRateCents: -1,
      currency: "BRL",
      timezone: "UTC",
    }),
  ).rejects.toThrow();
  await expect(
    a.savePreferences({
      hourlyRateCents: 10,
      currency: "USD",
      timezone: "Inválido",
    }),
  ).rejects.toThrow();
  await expect(a.command({ action: "resume", version: 0 })).rejects.toThrow(
    "Nenhuma atividade",
  );
  await a.command({ action: "start", version: 0 });
  clock(90_000);
  await expect(a.command({ action: "stop", version: 1 })).rejects.toThrow(
    "relógio",
  );
  expect((await a.getState()).version).toBe(1);
  expect((await a.getState()).active?.endedAt).toBeNull();
});
