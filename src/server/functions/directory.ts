import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "../require-session";
import { parseClientInput, parseProjectInput } from "../../lib/directory-input";
import { db } from "../../db";
import { createDirectoryStore } from "../directory";

export const getDirectory = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();
    const store = createDirectoryStore(db);
    const [clients, projects] = await Promise.all([
      store.listClients(),
      store.listProjects(),
    ]);
    return { clients, projects };
  },
);
export const saveClient = createServerFn({ method: "POST" })
  .validator(parseClientInput)
  .handler(async ({ data }) => {
    await requireSession();
    return createDirectoryStore(db).saveClient(data);
  });
export const saveProject = createServerFn({ method: "POST" })
  .validator(parseProjectInput)
  .handler(async ({ data }) => {
    await requireSession();
    return createDirectoryStore(db).saveProject(data);
  });
