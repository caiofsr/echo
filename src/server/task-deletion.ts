import { createHash } from "node:crypto";
import { and, asc, eq, inArray, not, sql } from "drizzle-orm";
import { parse } from "valibot";
import type { Database } from "../db/connection";
import {
  boardTask,
  invoiceRecord,
  timeRecord,
  timerPreferences,
  timerState,
} from "../db/schema";
import {
  taskDeletionConfirmSchema,
  taskDeletionPreviewSchema,
  type TaskDeletionConfirmation,
  type TaskDeletionSelection,
} from "../lib/task-deletion-input";

import { hasValidInvoice } from "./invoices";

const billedPeriod = hasValidInvoice(timeRecord.id);
const conflict = { status: "conflict" } as const;

async function previewDeletion(
  db: Pick<Database, "select">,
  selection: TaskDeletionSelection,
) {
  const rows = await db
    .select({
      task: boardTask,
      record: timeRecord,
      timezone: timerPreferences.timezone,
      billed: billedPeriod,
    })
    .from(boardTask)
    .leftJoin(timeRecord, eq(timeRecord.taskId, boardTask.id))
    .innerJoin(timerPreferences, eq(timerPreferences.id, 1))
    .where(eq(boardTask.id, selection.id))
    .orderBy(asc(timeRecord.startedAt), asc(timeRecord.id));
  const first = rows[0];
  if (!first || first.task.version !== selection.version) return conflict;
  if (first.task.archiveBatch !== null) return { status: "archived" } as const;
  const revision = createHash("sha256")
    .update(JSON.stringify([selection.hours, rows]))
    .digest("hex");

  return {
    status: "ready",
    revision,
    timezone: first.timezone,
    records: rows.flatMap(({ record, billed }) =>
      record
        ? [
            {
              id: record.id,
              startedAt: record.startedAt,
              endedAt: record.endedAt,
              billed: Boolean(billed),
              remove: selection.hours === "remove" && !billed,
            },
          ]
        : [],
    ),
  } as const;
}

function isWriteConflict(error: unknown) {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if ("code" in cause && /^SQLITE_(BUSY|LOCKED)/.test(String(cause.code)))
      return true;
  }
  return false;
}

export function createTaskDeletionStore(db: Database, clock = Date.now) {
  return {
    preview(input: TaskDeletionSelection) {
      return previewDeletion(db, parse(taskDeletionPreviewSchema, input));
    },
    async confirm(input: TaskDeletionConfirmation) {
      const { revision, ...selection } = parse(
        taskDeletionConfirmSchema,
        input,
      );
      try {
        return await db.transaction(async (tx) => {
          const preview = await previewDeletion(tx, selection);
          if (preview.status !== "ready") return preview;
          if (preview.revision !== revision) return conflict;

          const active = preview.records.find(
            (record) => record.endedAt === null,
          );
          if (active) {
            // The existing stop trigger advances the timer revision.
            await tx
              .update(timeRecord)
              .set({ endedAt: Math.floor(clock() / 1000) })
              .where(eq(timeRecord.id, active.id));
          } else if (preview.records.length) {
            // A concurrent resume must not use the previous record association.
            await tx
              .update(timerState)
              .set({ version: sql`${timerState.version} + 1` })
              .where(eq(timerState.id, 1));
          }

          if (preview.records.some((record) => record.remove)) {
            const removableRecords = tx
              .select({ id: timeRecord.id })
              .from(timeRecord)
              .where(
                and(eq(timeRecord.taskId, selection.id), not(billedPeriod)),
              );
            await tx
              .delete(invoiceRecord)
              .where(inArray(invoiceRecord.recordId, removableRecords));
            await tx
              .delete(timeRecord)
              .where(inArray(timeRecord.id, removableRecords));
          }
          await tx
            .update(timeRecord)
            .set({ taskId: null, version: sql`${timeRecord.version} + 1` })
            .where(eq(timeRecord.taskId, selection.id));
          await tx.delete(boardTask).where(eq(boardTask.id, selection.id));
          return { status: "deleted" } as const;
        });
      } catch (error) {
        if (isWriteConflict(error)) return conflict;
        throw error;
      }
    },
  };
}
