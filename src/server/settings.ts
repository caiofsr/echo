import { asc, eq } from "drizzle-orm";
import * as v from "valibot";
import type { Database } from "../db/connection";
import { companySettings, paymentMethod } from "../db/schema";
import {
  companyInputSchema,
  paymentMethodInputSchema,
} from "../lib/settings-input";
import type {
  Company,
  CompanyInput,
  SavedCompany,
} from "../types/settings/company";
import type {
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../types/settings/payment-method";

function normalize(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeCompany(input: CompanyInput): Company {
  const data = v.parse(companyInputSchema, input);
  return {
    name: data.name,
    taxId: normalize(data.taxId),
    address: normalize(data.address),
    phone: normalize(data.phone),
  };
}

function normalizePaymentMethod(input: PaymentMethodInput): PaymentMethodInput {
  return v.parse(paymentMethodInputSchema, input);
}

export function createSettingsStore(db: Database) {
  return {
    listCompanies(): Promise<SavedCompany[]> {
      return db
        .select()
        .from(companySettings)
        .orderBy(asc(companySettings.name), asc(companySettings.id));
    },

    async createCompany(input: CompanyInput): Promise<SavedCompany> {
      const company = normalizeCompany(input);
      const [created] = await db
        .insert(companySettings)
        .values({ id: crypto.randomUUID(), ...company })
        .returning();
      return created;
    },

    async updateCompany(
      id: string,
      input: CompanyInput,
    ): Promise<SavedCompany> {
      const [updated] = await db
        .update(companySettings)
        .set(normalizeCompany(input))
        .where(eq(companySettings.id, id))
        .returning();
      if (!updated) throw new Error("Empresa não encontrada.");
      return updated;
    },

    listPaymentMethods(): Promise<SavedPaymentMethod[]> {
      return db.select().from(paymentMethod).orderBy(asc(paymentMethod.id));
    },

    listActivePaymentMethods(): Promise<SavedPaymentMethod[]> {
      return db
        .select()
        .from(paymentMethod)
        .where(eq(paymentMethod.archived, false))
        .orderBy(asc(paymentMethod.id));
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
      if (!updated) throw new Error("Forma de recebimento não encontrada.");
      return updated;
    },

    async setPaymentMethodArchived(
      id: number,
      archived: boolean,
    ): Promise<SavedPaymentMethod> {
      const [updated] = await db
        .update(paymentMethod)
        .set({ archived })
        .where(eq(paymentMethod.id, id))
        .returning();
      if (!updated) throw new Error("Dados de recebimento não encontrados.");
      return updated;
    },
  };
}
