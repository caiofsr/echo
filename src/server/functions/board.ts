import { createServerFn } from "@tanstack/react-start";
import { requireSessionMiddleware } from "../middleware/auth";
import {
  columnInputSchema,
  columnRemovalInputSchema,
  columnOrderInputSchema,
  taskInputSchema,
  taskDeletionInputSchema,
  taskDeletionPreviewInputSchema,
  taskMoveInputSchema,
} from "../../lib/board-input";
import { db } from "../../db";
import { createBoardStore } from "../board";

export const getBoard = createServerFn({ method: "GET" })
  .middleware([requireSessionMiddleware])
  .handler(async () => {
    return createBoardStore(db).getBoard();
  });

export const saveColumn = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(columnInputSchema)
  .handler(async ({ data }) => {
    return createBoardStore(db).saveColumn(data);
  });

export const removeColumn = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(columnRemovalInputSchema)
  .handler(async ({ data }) => {
    return createBoardStore(db).removeColumn(data.id);
  });

export const reorderColumns = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(columnOrderInputSchema)
  .handler(async ({ data }) => {
    await createBoardStore(db).reorderColumns(data.columns);
  });

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskInputSchema)
  .handler(async ({ data }) => {
    return createBoardStore(db).saveTask(data);
  });

export const prepareTaskDeletion = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskDeletionPreviewInputSchema)
  .handler(async ({ data }) => {
    return createBoardStore(db).prepareTaskDeletion(data);
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskDeletionInputSchema)
  .handler(async ({ data }) => {
    return createBoardStore(db).deleteTask(data);
  });

export const moveTask = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskMoveInputSchema)
  .handler(async ({ data }) => {
    await createBoardStore(db).moveTask(data);
  });
