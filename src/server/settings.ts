import { asc, eq } from "drizzle-orm";
import type { Database } from "../db/connection";
import { companySettings, paymentMethod } from "../db/schema";
import type {
  Company,
  CompanyInput,
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../lib/settings-types";

function normalize(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeCompany(input: CompanyInput): Company {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome ou a razão social.");
  return {
    name,
    taxId: normalize(input.taxId),
    address: normalize(input.address),
    phone: normalize(input.phone),
  };
}

function normalizePaymentMethod(input: PaymentMethodInput): PaymentMethodInput {
  const label = input.label.trim();
  const instructions = input.instructions.trim();
  if (!label) throw new Error("Informe um rótulo.");
  if (!instructions) throw new Error("Informe as instruções de recebimento.");
  return { label, instructions };
}

export function createSettingsStore(db: Database) {
  return {
    async getCompany(): Promise<Company | null> {
      const [company] = await db
        .select({
          name: companySettings.name,
          taxId: companySettings.taxId,
          address: companySettings.address,
          phone: companySettings.phone,
        })
        .from(companySettings)
        .where(eq(companySettings.id, "owner"))
        .limit(1);
      return company ?? null;
    },

    async saveCompany(input: CompanyInput): Promise<Company> {
      const company = normalizeCompany(input);
      await db
        .insert(companySettings)
        .values({ id: "owner", ...company })
        .onConflictDoUpdate({ target: companySettings.id, set: company });
      return company;
    },

    listPaymentMethods(): Promise<SavedPaymentMethod[]> {
      return db.select().from(paymentMethod).orderBy(asc(paymentMethod.id));
    },

    async createPaymentMethod(
      input: PaymentMethodInput,
    ): Promise<SavedPaymentMethod> {
      const values = normalizePaymentMethod(input);
      const [created] = await db
        .insert(paymentMethod)
        .values(values)
        .returning();
      return created;
    },

    async updatePaymentMethod(
      id: number,
      input: PaymentMethodInput,
    ): Promise<SavedPaymentMethod> {
      const values = normalizePaymentMethod(input);
      const [updated] = await db
        .update(paymentMethod)
        .set(values)
        .where(eq(paymentMethod.id, id))
        .returning();
      if (!updated)
        throw new Error("Conjunto de dados de pagamento não encontrado.");
      return updated;
    },
  };
}
