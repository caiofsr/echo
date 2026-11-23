import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { parse } from "valibot";
import type { Database } from "../db/connection";
import { boardTask, client, project, timeRecord } from "../db/schema";
import { archiveInputSchema, type ArchiveInput } from "../lib/archive-input";

const entities = { task: boardTask, project, client };

export function createArchiveStore(db: Database, clock = Date.now) {
  return {
    async change(input: ArchiveInput) {
      const { kind, action, id, version, confirmedRecordId } = parse(
        archiveInputSchema,
        input,
      );
      const table = entities[kind];
      return db.transaction(async (tx) => {
        const [target] = await tx.select().from(table).where(eq(table.id, id));
        if (!target || target.version !== version)
          return { status: "conflict" } as const;
        const restoring = action === "restore";
        if (restoring === (target.archiveBatch === null))
          return { status: "saved" } as const;

        if (restoring) {
          if ("projectId" in target && target.projectId !== null) {
            const [parent] = await tx
              .select()
              .from(project)
              .where(eq(project.id, target.projectId));
            if (parent?.archiveBatch)
              return {
                status: "blocked",
                message: "Restaure o projeto antes da tarefa.",
              } as const;
          }
          if ("clientId" in target) {
            const [parent] = await tx
              .select()
              .from(client)
              .where(eq(client.id, target.clientId));
            if (parent?.archiveBatch)
              return {
                status: "blocked",
                message: "Restaure o cliente antes do projeto.",
              } as const;
          }
        }

        const previousBatch = target.archiveBatch;
        const projectScope =
          kind === "client" ? eq(project.clientId, id) : eq(project.id, id);
        const projectIds =
          kind === "task"
            ? []
            : tx
                .select({ id: project.id })
                .from(project)
                .where(
                  and(
                    projectScope,
                    previousBatch === null
                      ? isNull(project.archiveBatch)
                      : eq(project.archiveBatch, previousBatch),
                  ),
                );
        const taskScope =
          kind === "task"
            ? eq(boardTask.id, id)
            : inArray(boardTask.projectId, projectIds);

        if (!restoring) {
          const affectedTasks = tx
            .select({ id: boardTask.id })
            .from(boardTask)
            .where(and(taskScope, isNull(boardTask.archiveBatch)));
          const [active] = await tx
            .select()
            .from(timeRecord)
            .where(
              and(
                isNull(timeRecord.endedAt),
                or(
                  inArray(timeRecord.taskId, affectedTasks),
                  inArray(timeRecord.projectId, projectIds),
                  kind === "client" ? eq(timeRecord.clientId, id) : undefined,
                ),
              ),
            );
          if (active && active.id !== confirmedRecordId)
            return {
              status: "confirmation-required",
              recordId: active.id,
            } as const;
          if (active) {
            const endedAt = Math.floor(clock() / 1000);
            if (endedAt < active.startedAt)
              throw new Error(
                "O relógio do servidor está anterior ao início do período.",
              );
            await tx
              .update(timeRecord)
              .set({ endedAt })
              .where(eq(timeRecord.id, active.id));
          }
        }

        const archiveBatch = restoring ? null : crypto.randomUUID();
        const taskFilter = and(
          taskScope,
          previousBatch === null
            ? isNull(boardTask.archiveBatch)
            : eq(boardTask.archiveBatch, previousBatch),
        );
        // Update tasks before their projects, since the task scope uses the previous project batch.
        await tx
          .update(boardTask)
          .set({ archiveBatch, version: sql`${boardTask.version} + 1` })
          .where(taskFilter);
        if (kind !== "task")
          await tx
            .update(project)
            .set({ archiveBatch, version: sql`${project.version} + 1` })
            .where(inArray(project.id, projectIds));
        if (kind === "client")
          await tx
            .update(client)
            .set({ archiveBatch, version: sql`${client.version} + 1` })
            .where(eq(client.id, id));
        return { status: "saved" } as const;
      });
    },
  };
}
