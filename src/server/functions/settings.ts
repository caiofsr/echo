import { createServerFn } from "@tanstack/react-start";
import {
  companyInputSchema,
  companyUpdateSchema,
  paymentMethodInputSchema,
  paymentMethodUpdateSchema,
  paymentMethodArchiveSchema,
} from "../../lib/settings-input";
import { db } from "../../db";
import { createSettingsStore } from "../settings";
import { requireSessionMiddleware } from "../middleware/auth";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSessionMiddleware])
  .handler(async () => {
    const store = createSettingsStore(db);
    const [companies, paymentMethods] = await Promise.all([
      store.listCompanies(),
      store.listPaymentMethods(),
    ]);
    return { companies, paymentMethods };
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(companyInputSchema)
  .handler(async ({ data }) => {
    return createSettingsStore(db).createCompany(data);
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(companyUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...input } = data;
    return createSettingsStore(db).updateCompany(id, input);
  });

export const createPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(paymentMethodInputSchema)
  .handler(async ({ data }) => {
    return createSettingsStore(db).createPaymentMethod(data);
  });

export const updatePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(paymentMethodUpdateSchema)
  .handler(async ({ data }) => {
    const { id, ...input } = data;
    return createSettingsStore(db).updatePaymentMethod(id, input);
  });

export const setPaymentMethodArchived = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(paymentMethodArchiveSchema)
  .handler(async ({ data }) => {
    return createSettingsStore(db).setPaymentMethodArchived(
      data.id,
      data.archived,
    );
  });
