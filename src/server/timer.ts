import { saveTimeRecord } from "./hours";
import type { TimeRecordInput } from "../lib/hours-input";
import * as v from "valibot";
import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import {
  boardTask,
  client,
  project,
  timeRecord,
  timerPreferences,
  timerState,
} from "../db/schema";
import {
  preferencesSchema,
  timerCommandSchema,
  type Preferences,
  type TimerCommand,
} from "../lib/timer-input";

export function createTimerStore(db: Database, clock = Date.now) {
  return {
    async getState() {
      // One SQL statement reads the revision and periods from the same snapshot.
      const rows = await db
        .select({
          preferences: timerPreferences,
          version: timerState.version,
          record: timeRecord,
          taskTitle: boardTask.title,
          projectName: project.name,
          taskArchive: boardTask.archiveBatch,
          projectArchive: project.archiveBatch,
          clientArchive: client.archiveBatch,
        })
        .from(timerState)
        .innerJoin(timerPreferences, eq(timerPreferences.id, 1))
        .leftJoin(timeRecord, sql`1 = 1`)
        .leftJoin(boardTask, eq(boardTask.id, timeRecord.taskId))
        .leftJoin(project, eq(project.id, timeRecord.projectId))
        .leftJoin(
          client,
          eq(
            client.id,
            sql`coalesce(${project.clientId}, ${timeRecord.clientId})`,
          ),
        )
        .orderBy(desc(timeRecord.startedAt), desc(timeRecord.id));
      const records = rows.flatMap((row) =>
        row.record
          ? [
              {
                ...row.record,
                taskTitle: row.taskTitle,
                projectName: row.projectName,
              },
            ]
          : [],
      );
      const last = rows.reduce<(typeof rows)[number] | null>(
        (latest, row) =>
          row.record &&
          !row.record.manual &&
          (!latest?.record || row.record.id > latest.record.id)
            ? row
            : latest,
        null,
      );
      return {
        canResume: Boolean(
          last &&
          !last.taskArchive &&
          !last.projectArchive &&
          !last.clientArchive,
        ),
        preferences: rows[0].preferences,
        version: rows[0].version,
        active: records.find((r) => r.endedAt === null) ?? null,
        lastTimedRecord:
          records.find((record) => record.id === last?.record?.id) ?? null,
        records,
        serverNow: Math.floor(clock() / 1000),
      };
    },
    saveRecord: (input: TimeRecordInput) =>
      saveTimeRecord(db, input, Math.floor(clock() / 1000)),
    async savePreferences(input: Preferences) {
      const values = v.parse(preferencesSchema, input);
      await db
        .update(timerPreferences)
        .set(values)
        .where(eq(timerPreferences.id, 1));
    },
    async command(input: TimerCommand) {
      const { action, version, taskId } = v.parse(timerCommandSchema, input);
      const conflict = {
        ok: false,
        message:
          "Cronômetro alterado em outra sessão. O estado foi atualizado; confira antes de tentar novamente.",
      };
      const [last] = await db
        .select()
        .from(timeRecord)
        .where(eq(timeRecord.manual, false))
        .orderBy(desc(timeRecord.id))
        .limit(1);
      const now = Math.floor(clock() / 1000);
      if (last && now < (last.endedAt ?? last.startedAt))
        throw new Error(
          "O relógio do servidor está anterior ao último período.",
        );
      if (action === "resume" && !last)
        throw new Error("Nenhuma atividade para retomar.");
      if (action === "stop") {
        const changed =
          await db.all(sql`UPDATE time_record SET ended_at = ${now}
            WHERE ended_at IS NULL AND started_at <= ${now}
            AND (SELECT version FROM timer_state WHERE id = 1) = ${version} RETURNING id`);
        return changed.length
          ? { ok: true, message: "Período salvo." }
          : conflict;
      }
      const [preferences] = await db
        .select()
        .from(timerPreferences)
        .where(eq(timerPreferences.id, 1));
      const sourceTaskId = action === "resume" ? last?.taskId : taskId;
      const [task] = sourceTaskId
        ? await db
            .select()
            .from(boardTask)
            .where(eq(boardTask.id, sourceTaskId))
        : [];
      if (sourceTaskId && !task)
        throw new Error("Tarefa não encontrada. Atualize o quadro.");
      const projectId = action === "resume" ? last!.projectId : task?.projectId;
      const [linkedProject] = projectId
        ? await db.select().from(project).where(eq(project.id, projectId))
        : [];
      const clientId =
        linkedProject?.clientId ??
        (action === "resume" && !projectId ? last!.clientId : null);
      if (task?.archiveBatch || linkedProject?.archiveBatch)
        throw new Error(
          "Restaure o trabalho arquivado antes de iniciar o cronômetro.",
        );
      // The insert and the switch trigger are one SQLite statement: failed
      // inserts roll back the previous period's stop and revision as well.
      const changed = await db.all(sql`INSERT INTO time_record
          (started_at, task_id, project_id, client_id, description, hourly_rate_cents, currency)
          SELECT ${now}, ${sourceTaskId ?? null}, ${projectId ?? null}, ${clientId},
            ${action === "resume" ? last!.description : task ? task.description || task.title : null},
            ${linkedProject?.hourlyRateCents ?? preferences.hourlyRateCents}, ${linkedProject?.currency ?? preferences.currency}
          WHERE (SELECT version FROM timer_state WHERE id = 1) = ${version}
          AND NOT EXISTS (SELECT 1 FROM board_task WHERE id = ${sourceTaskId ?? null} AND archive_batch IS NOT NULL)
          AND NOT EXISTS (SELECT 1 FROM project WHERE id = ${projectId ?? null} AND archive_batch IS NOT NULL)
          AND NOT EXISTS (SELECT 1 FROM client WHERE id = ${clientId} AND archive_batch IS NOT NULL)
          AND NOT EXISTS (SELECT 1 FROM time_record WHERE ended_at > ${now} OR started_at > ${now})
          AND NOT EXISTS (SELECT 1 FROM time_record WHERE ended_at IS NULL
            AND (${action !== "start" || sourceTaskId == null} OR task_id = ${sourceTaskId ?? null}))
          RETURNING id`);
      return changed.length
        ? { ok: true, message: "Cronômetro iniciado." }
        : conflict;
    },
  };
}
