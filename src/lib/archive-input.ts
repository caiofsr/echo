import * as v from "valibot";

const id = v.pipe(v.number(), v.safeInteger(), v.minValue(1));
export const archiveInputSchema = v.object({
  kind: v.picklist(["client", "project", "task"]),
  action: v.picklist(["archive", "restore"]),
  id,
  version: id,
  confirmedRecordId: v.optional(id),
});
export type ArchiveInput = v.InferOutput<typeof archiveInputSchema>;
