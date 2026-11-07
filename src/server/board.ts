import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import { boardColumn, boardTask, client, project } from "../db/schema";
import {
  parseColumnInput,
  parseTaskInput,
  parseTaskMoveInput,
  type ColumnInput,
  type TaskInput,
  type TaskMoveInput,
} from "../lib/board-input";

// As posições únicas por coluna (índice unique) exigem folga durante o
// resequenciamento; qualquer quadro pessoal fica muito abaixo desta marca.
const REPLACEMENT_OFFSET = 1_000_000;

export function createBoardStore(db: Database) {
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
      .where(eq(project.id, projectId))
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
          .where(eq(boardTask.id, id))
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

    async moveTask(input: TaskMoveInput) {
      const { taskId, columnId, position } = parseTaskMoveInput(input);
      await verifyColumn(columnId);
      await db.transaction(async (tx) => {
        const [task] = await tx
          .select({ id: boardTask.id, columnId: boardTask.columnId })
          .from(boardTask)
          .where(eq(boardTask.id, taskId))
          .limit(1);
        if (!task)
          throw new Error(
            "Tarefa não encontrada. Atualize o quadro e tente novamente.",
          );
        const affectedColumns = [columnId];
        if (task.columnId !== columnId) affectedColumns.push(task.columnId);
        const affected = await tx
          .select({ id: boardTask.id, columnId: boardTask.columnId })
          .from(boardTask)
          .where(inArray(boardTask.columnId, affectedColumns));
        const build = (columnOf: number, excludeId?: number) =>
          affected
            .filter(
              (item) => item.columnId === columnOf && item.id !== excludeId,
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
