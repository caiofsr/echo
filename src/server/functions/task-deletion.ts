import { createServerFn } from "@tanstack/react-start";
import { db } from "../../db";
import {
  taskDeletionConfirmSchema,
  taskDeletionPreviewSchema,
} from "../../lib/task-deletion-input";
import { requireSessionMiddleware } from "../middleware/auth";
import { createTaskDeletionStore } from "../task-deletion";

export const previewTaskDeletion = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskDeletionPreviewSchema)
  .handler(({ data }) => createTaskDeletionStore(db).preview(data));

export const confirmTaskDeletion = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(taskDeletionConfirmSchema)
  .handler(({ data }) => createTaskDeletionStore(db).confirm(data));
