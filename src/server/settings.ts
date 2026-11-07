import * as v from "valibot";
import { asc, eq } from "drizzle-orm";
import type { Database } from "../db/connection";
import { companySettings, paymentMethod } from "../db/schema";
import {
  companyInputSchema,
  paymentMethodInputSchema,
} from "../lib/settings-input";
import type {
  Company,
  CompanyInput,
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../lib/settings-types";

function normalizeCompany(input: CompanyInput): Company {
  const parsed = v.parse(companyInputSchema, input);
  return {
    name: parsed.name,
    taxId: parsed.taxId || null,
    address: parsed.address || null,
    phone: parsed.phone || null,
  };
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
      const values = v.parse(paymentMethodInputSchema, input);
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
      const values = v.parse(paymentMethodInputSchema, input);
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
