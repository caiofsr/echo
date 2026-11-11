import * as v from "valibot";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import { timeRecord, timerPreferences, timerState } from "../db/schema";
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
        })
        .from(timerState)
        .innerJoin(timerPreferences, eq(timerPreferences.id, 1))
        .leftJoin(timeRecord, sql`1 = 1`)
        .orderBy(desc(timeRecord.id));
      const records = rows.flatMap((row) => (row.record ? [row.record] : []));
      return {
        preferences: rows[0].preferences,
        version: rows[0].version,
        active: records.find((r) => r.endedAt === null) ?? null,
        records,
        serverNow: Math.floor(clock() / 1000),
      };
    },
    async savePreferences(input: Preferences) {
      const values = v.parse(preferencesSchema, input);
      await db
        .update(timerPreferences)
        .set(values)
        .where(eq(timerPreferences.id, 1));
    },
    async command(input: TimerCommand) {
      const { action, version } = v.parse(timerCommandSchema, input);
      const now = Math.floor(clock() / 1000);
      const [last] = await db
        .select()
        .from(timeRecord)
        .orderBy(desc(timeRecord.id))
        .limit(1);
      if (action === "resume" && !last)
        throw new Error("Nenhuma atividade para retomar.");
      if (last && now < (last.endedAt ?? last.startedAt))
        throw new Error(
          "O relógio do servidor está anterior ao último período.",
        );
      // Each action is a single atomic statement. Triggers advance the revision
      // within that same statement, including across independent connections.
      const changed =
        action === "stop"
          ? await db
              .update(timeRecord)
              .set({ endedAt: now })
              .where(
                and(
                  isNull(timeRecord.endedAt),
                  sql`${timeRecord.startedAt} <= ${now}`,
                  sql`(SELECT version FROM timer_state WHERE id = 1) = ${version}`,
                ),
              )
              .returning({ id: timeRecord.id })
          : await db.all<{
              id: number;
            }>(sql`INSERT INTO time_record (started_at, hourly_rate_cents, currency)
          SELECT ${now}, hourly_rate_cents, currency FROM timer_preferences
          WHERE id = 1 AND (SELECT version FROM timer_state WHERE id = 1) = ${version}
          AND NOT EXISTS (SELECT 1 FROM time_record WHERE ended_at IS NULL OR ended_at > ${now})
          RETURNING id`);
      return changed.length
        ? {
            ok: true,
            message:
              action === "stop" ? "Período salvo." : "Cronômetro iniciado.",
          }
        : {
            ok: false,
            message:
              "Cronômetro alterado em outra sessão. O estado foi atualizado; confira antes de tentar novamente.",
          };
    },
  };
}
