import { createServerFn } from "@tanstack/react-start";
import { db } from "../../db";
import { archiveInputSchema } from "../../lib/archive-input";
import { createArchiveStore } from "../archive";
import { requireSessionMiddleware } from "../middleware/auth";

export const changeArchive = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(archiveInputSchema)
  .handler(({ data }) => createArchiveStore(db).change(data));
