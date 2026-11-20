import * as v from "valibot";

const id = v.pipe(v.number(), v.safeInteger(), v.minValue(1));
const timestamp = v.pipe(
  v.number(),
  v.safeInteger(),
  v.minValue(0),
  v.maxValue(253402300799),
);
const recordFields = {
  startedAt: timestamp,
  endedAt: timestamp,
  description: v.pipe(v.string(), v.trim()),
  taskId: v.nullable(id),
  projectId: v.nullable(id),
  clientId: v.nullable(id),
};

export const timeRecordInputSchema = v.union([
  v.object({ ...recordFields, id: v.optional(v.never()) }),
  v.object({
    ...recordFields,
    id,
    version: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
  }),
]);
export type TimeRecordInput = v.InferOutput<typeof timeRecordInputSchema>;
