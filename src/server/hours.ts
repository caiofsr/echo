import { sql } from "drizzle-orm";
import * as v from "valibot";
import type { Database } from "../db/connection";
import {
  timeRecordInputSchema,
  type TimeRecordInput,
} from "../lib/hours-input";

export async function saveTimeRecord(
  db: Database,
  input: TimeRecordInput,
  now: number,
) {
  const { id, startedAt, endedAt, description, taskId, projectId, clientId } =
    v.parse(timeRecordInputSchema, input);
  const fail = (message: string) => ({ ok: false as const, message });
  const empty = startedAt === endedAt;
  const invalidPeriod = "O fim deve ser posterior ao início.";
  if (startedAt > endedAt || (empty && id === undefined))
    return fail(invalidPeriod);
  if (endedAt > now)
    return fail("O fim deve estar no passado ou no horário atual.");

  // Half-open periods may touch. An active timer occupies everything from its start.
  const overlap = sql`${!empty} AND (${id ?? null} IS NULL OR id <> ${id ?? null})
    AND started_at < ${endedAt}
    AND (ended_at IS NULL OR (ended_at > ${startedAt} AND ended_at > started_at))`;
  const validTask = sql`(${taskId} IS NULL OR EXISTS (SELECT 1 FROM board_task WHERE id = ${taskId}))`;
  const associations = sql`
    ${validTask}
    AND (${clientId} IS NULL OR EXISTS (SELECT 1 FROM client WHERE id = ${clientId}))
    AND (${projectId} IS NULL OR EXISTS (
      SELECT 1 FROM project WHERE id = ${projectId}
      AND (${clientId} IS NULL OR client_id = ${clientId})
    ))`;
  const owner = sql`COALESCE((SELECT client_id FROM project WHERE id = ${projectId}), ${clientId})`;

  const sameAssociation = sql`project_id IS ${projectId} AND client_id IS ${clientId}`;
  const notInvoiced = sql`NOT EXISTS (
    SELECT 1 FROM invoice_record ir
    JOIN invoice i ON i.id = ir.invoice_id
    WHERE ir.record_id = time_record.id AND i.cancelled_at IS NULL
  )`;

  // SQLite evaluates the guards and writes in one statement, even across connections.
  const changed =
    id === undefined
      ? await db.all(sql`INSERT INTO time_record
        (manual, started_at, ended_at, description, task_id, project_id, client_id, hourly_rate_cents, currency)
      SELECT 1, ${startedAt}, ${endedAt}, ${description || null}, ${taskId}, ${projectId}, ${owner},
        COALESCE(project.hourly_rate_cents, timer_preferences.hourly_rate_cents),
        COALESCE(project.currency, timer_preferences.currency)
      FROM timer_preferences LEFT JOIN project ON project.id = ${projectId}
      WHERE timer_preferences.id = 1 AND ${associations}
        AND NOT EXISTS (SELECT 1 FROM time_record WHERE ${overlap})
      RETURNING id`)
      : await db.all(sql`UPDATE time_record SET
        started_at = ${startedAt}, ended_at = ${endedAt}, description = ${description || null},
        task_id = ${taskId}, project_id = ${projectId},
        client_id = CASE WHEN ${sameAssociation} THEN client_id ELSE ${owner} END,
        version = version + 1
      WHERE id = ${id} AND version = ${"version" in input ? input.version : -1} AND ended_at IS NOT NULL
        AND ${notInvoiced}
        AND (${!empty} OR (started_at = ${startedAt} AND ended_at = ${endedAt}))
        AND (${associations} OR (${sameAssociation} AND ${validTask}))
        AND NOT EXISTS (SELECT 1 FROM time_record WHERE ${overlap})
      RETURNING id`);
  if (changed.length)
    return { ok: true as const, message: "Registro de horas salvo." };

  const [conflict] = await db.all<{
    id: number;
    startedAt: number;
    endedAt: number | null;
    description: string | null;
  }>(sql`SELECT id, started_at AS startedAt, ended_at AS endedAt, description
    FROM time_record WHERE ${overlap} ORDER BY started_at, id LIMIT 1`);
  if (conflict)
    return { ...fail("Este período se sobrepõe a outro registro."), conflict };

  const [valid] = await db.all(sql`SELECT 1 WHERE ${associations}`);
  if (!valid)
    return fail(
      "Confira se a tarefa, o projeto e o cliente selecionados são válidos.",
    );
  if (id !== undefined) {
    const [invoiced] = await db.all(sql`SELECT 1
      FROM invoice_record ir
      JOIN invoice i ON i.id = ir.invoice_id
      WHERE ir.record_id = ${id} AND i.cancelled_at IS NULL LIMIT 1`);
    if (invoiced)
      return fail(
        "Este registro está vinculado a uma fatura válida e não pode ser alterado.",
      );
    const [current] = await db.all<{ version: number; endedAt: number | null }>(
      sql`SELECT version, ended_at AS endedAt FROM time_record WHERE id = ${id}`,
    );
    if (
      !current ||
      current.endedAt === null ||
      !("version" in input) ||
      current.version !== input.version
    )
      return fail(
        "O registro está em andamento ou foi alterado em outra sessão. Atualize o histórico e tente novamente.",
      );
    if (empty) return fail(invalidPeriod);
  }
  return fail(
    "O histórico mudou enquanto você salvava. Confira os horários e tente novamente.",
  );
}
