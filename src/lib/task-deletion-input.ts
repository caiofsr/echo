import * as v from "valibot";

const positiveInteger = v.pipe(v.number(), v.safeInteger(), v.minValue(1));

const selection = {
  id: positiveInteger,
  version: positiveInteger,
  hours: v.picklist(["keep", "remove"]),
};

export const taskDeletionPreviewSchema = v.object(selection);
export const taskDeletionConfirmSchema = v.object({
  ...selection,
  revision: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),
});

export type TaskDeletionSelection = v.InferOutput<
  typeof taskDeletionPreviewSchema
>;
export type TaskDeletionConfirmation = v.InferOutput<
  typeof taskDeletionConfirmSchema
>;
