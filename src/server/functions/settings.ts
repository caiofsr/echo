import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { auth } from "../../lib/auth";
import {
  parseCompanyInput,
  parsePaymentMethodInput,
  parsePaymentMethodUpdate,
} from "../../lib/settings-input";
import { db } from "../../db";
import { createSettingsStore } from "../settings";

async function requireSession() {
  setResponseHeader("Cache-Control", "no-store");
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Sessão inválida.");
}

export const getSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();
    const store = createSettingsStore(db);
    const [company, paymentMethods] = await Promise.all([
      store.getCompany(),
      store.listPaymentMethods(),
    ]);
    return { company, paymentMethods };
  },
);

export const saveCompanySettings = createServerFn({ method: "POST" })
  .validator(parseCompanyInput)
  .handler(async ({ data }) => {
    await requireSession();
    return createSettingsStore(db).saveCompany(data);
  });

export const createPaymentMethod = createServerFn({ method: "POST" })
  .validator(parsePaymentMethodInput)
  .handler(async ({ data }) => {
    await requireSession();
    return createSettingsStore(db).createPaymentMethod(data);
  });

export const updatePaymentMethod = createServerFn({ method: "POST" })
  .validator(parsePaymentMethodUpdate)
  .handler(async ({ data }) => {
    await requireSession();
    const { id, ...input } = data;
    return createSettingsStore(db).updatePaymentMethod(id, input);
  });
