import { createServerFn } from "@tanstack/react-start";
import { requireSessionMiddleware } from "../middleware/auth";
import {
  companyInputSchema,
  paymentMethodInputSchema,
  paymentMethodUpdateSchema,
} from "../../lib/settings-input";
import { db } from "../../db";
import { createSettingsStore } from "../settings";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSessionMiddleware])
  .handler(async () => {
    const store = createSettingsStore(db);
    const [company, paymentMethods] = await Promise.all([
      store.getCompany(),
      store.listPaymentMethods(),
    ]);
    return { company, paymentMethods };
  });

export const saveCompanySettings = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(companyInputSchema)
  .handler(async ({ data }) => {
    return createSettingsStore(db).saveCompany(data);
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
