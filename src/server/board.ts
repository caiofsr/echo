import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import {
  boardColumn,
  boardTask,
  client,
  project,
  timeRecord,
  timerState,
} from "../db/schema";
import {
  parseColumnInput,
  parseTaskInput,
  parseTaskDeletionInput,
  parseTaskDeletionPreviewInput,
  parseTaskMoveInput,
  type ColumnInput,
  type TaskDeletionInput,
  type TaskDeletionPreviewInput,
  type TaskInput,
  type TaskMoveInput,
} from "../lib/board-input";

// As posições únicas por coluna (índice unique) exigem folga durante o
// resequenciamento; qualquer quadro pessoal fica muito abaixo desta marca.
const REPLACEMENT_OFFSET = 1_000_000;

export function createBoardStore(db: Database, clock = Date.now) {
  async function verifyColumn(columnId: number) {
    const [column] = await db
      .select({ id: boardColumn.id })
      .from(boardColumn)
      .where(eq(boardColumn.id, columnId))
      .limit(1);
    if (!column) throw new Error("Escolha uma coluna cadastrada.");
    return column;
  }

  async function verifyProject(projectId: number | null | undefined) {
    if (projectId === null || projectId === undefined) return;
    const [found] = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.id, projectId), isNull(project.archiveBatch)))
      .limit(1);
    if (!found) throw new Error("Escolha um projeto cadastrado.");
  }

  return {
    async getBoard() {
      const [columns, tasks, projects] = await Promise.all([
        db
          .select()
          .from(boardColumn)
          .orderBy(asc(boardColumn.position), asc(boardColumn.id)),
        db
          .select()
          .from(boardTask)
          .orderBy(
            asc(boardTask.columnId),
            asc(boardTask.position),
            asc(boardTask.id),
          ),
        db
          .select({
            id: project.id,
            name: project.name,
            clientId: project.clientId,
            archiveBatch: project.archiveBatch,
          })
          .from(project)
          .innerJoin(client, eq(client.id, project.clientId))
          .orderBy(asc(project.name), asc(project.id)),
      ]);
      return { columns, tasks, projects };
    },

    async saveColumn(input: ColumnInput) {
      const { id, version, ...parsed } = parseColumnInput(input);
      if (id === undefined) {
        const created = await db.transaction(async (tx) => {
          const [highest] = await tx
            .select({ position: boardColumn.position })
            .from(boardColumn)
            .orderBy(sql`${boardColumn.position} desc`)
            .limit(1);
          const rows = await tx
            .insert(boardColumn)
            .values({
              name: parsed.name,
              position: (highest?.position ?? -1) + 1,
            })
            .returning();
          return rows[0];
        });
        return created;
      }
      const [updated] = await db
        .update(boardColumn)
        .set({ name: parsed.name, version: sql`${boardColumn.version} + 1` })
        .where(
          and(eq(boardColumn.id, id), eq(boardColumn.version, version ?? 0)),
        )
        .returning();
      if (!updated)
        throw new Error(
          "Coluna alterada em outra sessão ou não encontrada. Atualize o quadro, confira suas alterações e salve novamente.",
        );
      return updated;
    },

    async removeColumn(id: number) {
      await db.transaction(async (tx) => {
        const [occupied] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(boardTask)
          .where(eq(boardTask.columnId, id));
        if (Number(occupied?.count ?? 0) > 0)
          throw new Error(
            "Mova as tarefas para outra coluna antes de removê-la.",
          );
        await tx.delete(boardColumn).where(eq(boardColumn.id, id));
      });
    },

    async reorderColumns(orderedIds: number[]) {
      const current = await db
        .select({ id: boardColumn.id })
        .from(boardColumn)
        .orderBy(asc(boardColumn.position), asc(boardColumn.id));
      const valid = Array.isArray(orderedIds)
        ? orderedIds.length === current.length &&
          new Set(orderedIds).size === orderedIds.length &&
          current.every((column) => orderedIds.includes(column.id))
        : false;
      if (!valid)
        throw new Error(
          "Sequência de colunas inválida. Atualize o quadro e tente novamente.",
        );
      await db.transaction(async (tx) => {
        await tx.update(boardColumn).set({
          position: sql`${boardColumn.position} + ${REPLACEMENT_OFFSET}`,
        });
        for (const [index, id] of orderedIds.entries()) {
          await tx
            .update(boardColumn)
            .set({
              position: index,
              version: sql`${boardColumn.version} + 1`,
            })
            .where(eq(boardColumn.id, id));
        }
      });
    },

    async saveTask(input: TaskInput) {
      const { id, version, ...parsed } = parseTaskInput(input);
      await verifyColumn(parsed.columnId);
      await verifyProject(parsed.projectId);
      const values = {
        title: parsed.title,
        description: parsed.description || null,
        projectId: parsed.projectId ?? null,
        columnId: parsed.columnId,
      };
      if (id === undefined) {
        const created = await db.transaction(async (tx) => {
          const [highest] = await tx
            .select({ position: boardTask.position })
            .from(boardTask)
            .where(eq(boardTask.columnId, parsed.columnId))
            .orderBy(sql`${boardTask.position} desc`)
            .limit(1);
          const rows = await tx
            .insert(boardTask)
            .values({ ...values, position: (highest?.position ?? -1) + 1 })
            .returning();
          return rows[0];
        });
        return created;
      }
      const updated = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            columnId: boardTask.columnId,
            position: boardTask.position,
          })
          .from(boardTask)
          .where(and(eq(boardTask.id, id), isNull(boardTask.archiveBatch)))
          .limit(1);
        if (!existing)
          throw new Error(
            "Tarefa alterada em outra sessão ou não encontrada. Atualize o quadro, confira suas alterações e salve novamente.",
          );
        let position = existing.position;
        if (existing.columnId !== parsed.columnId) {
          const [highest] = await tx
            .select({ position: boardTask.position })
            .from(boardTask)
            .where(eq(boardTask.columnId, parsed.columnId))
            .orderBy(sql`${boardTask.position} desc`)
            .limit(1);
          position = (highest?.position ?? -1) + 1;
        }
        const [row] = await tx
          .update(boardTask)
          .set({ ...values, position, version: sql`${boardTask.version} + 1` })
          .where(and(eq(boardTask.id, id), eq(boardTask.version, version ?? 0)))
          .returning();
        if (!row)
          throw new Error(
            "Tarefa alterada em outra sessão ou não encontrada. Atualize o quadro, confira suas alterações e salve novamente.",
          );
        return row;
      });
      return updated;
    },

    async prepareTaskDeletion(input: TaskDeletionPreviewInput) {
      const { id, version } = parseTaskDeletionPreviewInput(input);
      const [task] = await db
        .select()
        .from(boardTask)
        .where(eq(boardTask.id, id))
        .limit(1);
      if (!task) return { status: "conflict" } as const;
      if (task.archiveBatch !== null) return { status: "blocked" } as const;
      if (task.version !== version) return { status: "conflict" } as const;

      const [[timer], records] = await Promise.all([
        db.select({ version: timerState.version }).from(timerState).limit(1),
        db
          .select({
            id: timeRecord.id,
            version: timeRecord.version,
            endedAt: timeRecord.endedAt,
            isInvoiced: sql<number>`EXISTS (
              SELECT 1 FROM invoice_record ir
              JOIN invoice i ON i.id = ir.invoice_id
              WHERE ir.record_id = time_record.id AND i.cancelled_at IS NULL
            )`,
          })
          .from(timeRecord)
          .where(eq(timeRecord.taskId, id))
          .orderBy(asc(timeRecord.id)),
      ]);
      return {
        status: "ready" as const,
        timerVersion: timer.version,
        records: records.map(
          ({ id: recordId, version: recordVersion, isInvoiced }) => ({
            id: recordId,
            version: recordVersion,
            isInvoiced: Boolean(isInvoiced),
          }),
        ),
        recordCount: records.length,
        invoicedRecordCount: records.filter((record) => record.isInvoiced)
          .length,
        deletableRecordCount: records.filter((record) => !record.isInvoiced)
          .length,
        activeRecordCount: records.filter((record) => record.endedAt === null)
          .length,
      };
    },

    async deleteTask(input: TaskDeletionInput) {
      const { id, version, timerVersion, records, deleteHours } =
        parseTaskDeletionInput(input);
      const expectedRecords = records
        .map((record) => ({
          id: record.id,
          version: record.version,
          isInvoiced: record.isInvoiced,
        }))
        .sort((left, right) => left.id - right.id);
      const finalWriteConflict = Symbol("task-delete-conflict");

      try {
        return await db.transaction(async (tx) => {
          const [task] = await tx
            .select()
            .from(boardTask)
            .where(eq(boardTask.id, id))
            .limit(1);
          if (!task) return { status: "conflict" } as const;
          if (task.archiveBatch !== null) return { status: "blocked" } as const;
          if (task.version !== version) return { status: "conflict" } as const;

          const [timer] = await tx
            .select({ version: timerState.version })
            .from(timerState)
            .limit(1);
          if (timer.version !== timerVersion)
            return { status: "conflict" } as const;

          const currentRecords = await tx
            .select({
              id: timeRecord.id,
              version: timeRecord.version,
              isInvoiced: sql<number>`EXISTS (
                SELECT 1 FROM invoice_record ir
                JOIN invoice i ON i.id = ir.invoice_id
                WHERE ir.record_id = time_record.id AND i.cancelled_at IS NULL
              )`,
            })
            .from(timeRecord)
            .where(eq(timeRecord.taskId, id))
            .orderBy(asc(timeRecord.id))
            .then((rows) =>
              rows.map((record) => ({
                ...record,
                isInvoiced: Boolean(record.isInvoiced),
              })),
            );
          if (
            JSON.stringify(currentRecords) !== JSON.stringify(expectedRecords)
          )
            return { status: "conflict" } as const;

          const [active] = await tx
            .select({ id: timeRecord.id, startedAt: timeRecord.startedAt })
            .from(timeRecord)
            .where(and(eq(timeRecord.taskId, id), isNull(timeRecord.endedAt)))
            .limit(1);
          if (active) {
            const endedAt = Math.floor(clock() / 1000);
            if (endedAt < active.startedAt)
              throw new Error(
                "O relógio do servidor está anterior ao início do período.",
              );
            const [stopped] = await tx
              .update(timeRecord)
              .set({ endedAt })
              .where(
                and(eq(timeRecord.id, active.id), isNull(timeRecord.endedAt)),
              )
              .returning({ id: timeRecord.id });
            if (!stopped) return { status: "conflict" } as const;
          }

          for (const record of currentRecords) {
            const predicate = and(
              eq(timeRecord.id, record.id),
              eq(timeRecord.version, record.version),
              eq(timeRecord.taskId, id),
            );
            const changed =
              deleteHours && !record.isInvoiced
                ? await tx
                    .delete(timeRecord)
                    .where(predicate)
                    .returning({ id: timeRecord.id })
                : await tx
                    .update(timeRecord)
                    .set({
                      taskId: null,
                      version: sql`${timeRecord.version} + 1`,
                    })
                    .where(predicate)
                    .returning({ id: timeRecord.id });
            if (!changed.length) throw finalWriteConflict;
          }

          const [deleted] = await tx
            .delete(boardTask)
            .where(
              and(
                eq(boardTask.id, id),
                eq(boardTask.version, version),
                isNull(boardTask.archiveBatch),
              ),
            )
            .returning({ id: boardTask.id });
          if (!deleted) throw finalWriteConflict;
          return { status: "deleted" } as const;
        });
      } catch (error) {
        if (error === finalWriteConflict)
          return { status: "conflict" } as const;
        throw error;
      }
    },

    async moveTask(input: TaskMoveInput) {
      const { taskId, columnId, position } = parseTaskMoveInput(input);
      await verifyColumn(columnId);
      await db.transaction(async (tx) => {
        const [task] = await tx
          .select({ id: boardTask.id, columnId: boardTask.columnId })
          .from(boardTask)
          .where(and(eq(boardTask.id, taskId), isNull(boardTask.archiveBatch)))
          .limit(1);
        if (!task)
          throw new Error(
            "Tarefa não encontrada. Atualize o quadro e tente novamente.",
          );
        const affectedColumns = [columnId];
        if (task.columnId !== columnId) affectedColumns.push(task.columnId);
        const affected = await tx
          .select({
            id: boardTask.id,
            columnId: boardTask.columnId,
            archiveBatch: boardTask.archiveBatch,
          })
          .from(boardTask)
          .where(inArray(boardTask.columnId, affectedColumns))
          .orderBy(asc(boardTask.position));
        const build = (columnOf: number, excludeId?: number) =>
          affected
            .filter(
              (item) =>
                item.columnId === columnOf &&
                item.id !== excludeId &&
                item.archiveBatch === null,
            )
            .map((item) => item.id);
        const sequence: Array<{
          id: number;
          columnId: number;
          position: number;
        }> = [];
        if (task.columnId !== columnId) {
          build(task.columnId, taskId).forEach((id, index) =>
            sequence.push({ id, columnId: task.columnId, position: index }),
          );
          const target = build(columnId, taskId);
          const at = Math.min(position, target.length);
          target.splice(at, 0, taskId);
          target.forEach((id, index) =>
            sequence.push({ id, columnId, position: index }),
          );
        } else {
          const same = build(columnId, taskId);
          const at = Math.min(position, same.length);
          same.splice(at, 0, taskId);
          same.forEach((id, index) =>
            sequence.push({ id, columnId, position: index }),
          );
        }
        for (const id of affectedColumns) {
          const activeCount = sequence.filter(
            (item) => item.columnId === id,
          ).length;
          affected
            .filter(
              (item) => item.columnId === id && item.archiveBatch !== null,
            )
            .forEach((item, index) =>
              sequence.push({
                id: item.id,
                columnId: id,
                position: activeCount + index,
              }),
            );
        }
        if (affectedColumns.length > 0) {
          await tx
            .update(boardTask)
            .set({
              position: sql`${boardTask.position} + ${REPLACEMENT_OFFSET}`,
            })
            .where(inArray(boardTask.columnId, affectedColumns));
        }
        for (const item of sequence) {
          await tx
            .update(boardTask)
            .set({ columnId: item.columnId, position: item.position })
            .where(eq(boardTask.id, item.id));
        }
      });
    },
  };
}

export type BoardStore = ReturnType<typeof createBoardStore>;
