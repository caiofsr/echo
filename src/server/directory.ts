import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import { client, project } from "../db/schema";
import {
  parseClientInput,
  parseProjectInput,
  hourlyRateToCents,
  type ProjectInput,
  type ClientInput,
} from "../lib/directory-input";

export function createDirectoryStore(db: Database) {
  return {
    listProjects: () =>
      db.select().from(project).orderBy(asc(project.name), asc(project.id)),
    async saveProject(input: ProjectInput) {
      const { id, version, hourlyRate, ...parsed } = parseProjectInput(input);
      const values = {
        ...parsed,
        hourlyRateCents: hourlyRateToCents(hourlyRate),
      };
      const [owner] = await db
        .select({ id: client.id })
        .from(client)
        .where(eq(client.id, values.clientId))
        .limit(1);
      if (!owner) throw new Error("Escolha um cliente cadastrado.");
      if (id === undefined) {
        const [created] = await db.insert(project).values(values).returning();
        return created;
      }
      const [updated] = await db
        .update(project)
        .set({ ...values, version: sql`${project.version} + 1` })
        .where(and(eq(project.id, id), eq(project.version, version ?? 0)))
        .returning();
      if (!updated)
        throw new Error(
          "Projeto alterado em outra sessão ou não encontrado. Atualize os dados, confira suas alterações e salve novamente.",
        );
      return updated;
    },
    listClients: () =>
      db.select().from(client).orderBy(asc(client.name), asc(client.id)),
    async saveClient(input: ClientInput) {
      const { id, version, ...parsed } = parseClientInput(input);
      const values = {
        ...parsed,
        legalName: parsed.legalName || null,
        taxId: parsed.taxId || null,
        address: parsed.address || null,
      };
      if (id === undefined) {
        const [created] = await db.insert(client).values(values).returning();
        return created;
      }
      const [updated] = await db
        .update(client)
        .set({ ...values, version: sql`${client.version} + 1` })
        .where(and(eq(client.id, id), eq(client.version, version ?? 0)))
        .returning();
      if (!updated)
        throw new Error(
          "Cliente alterado em outra sessão ou não encontrado. Atualize os dados, confira suas alterações e salve novamente.",
        );
      return updated;
    },
  };
}
