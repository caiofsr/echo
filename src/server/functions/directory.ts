import { createServerFn } from "@tanstack/react-start";
import { requireSessionMiddleware } from "../middleware/auth";
import {
  clientInputSchema,
  projectInputSchema,
} from "../../lib/directory-input";
import { db } from "../../db";
import { createDirectoryStore } from "../directory";

export const getDirectory = createServerFn({ method: "GET" })
  .middleware([requireSessionMiddleware])
  .handler(async () => {
    const store = createDirectoryStore(db);
    const [clients, projects] = await Promise.all([
      store.listClients(),
      store.listProjects(),
    ]);
    return { clients, projects };
  });
export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(clientInputSchema)
  .handler(async ({ data }) => {
    return createDirectoryStore(db).saveClient(data);
  });
export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(projectInputSchema)
  .handler(async ({ data }) => {
    return createDirectoryStore(db).saveProject(data);
  });
