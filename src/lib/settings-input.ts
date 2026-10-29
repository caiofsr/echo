import type { CompanyInput, PaymentMethodInput } from "./settings-types";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Dados inválidos.");
  return value as Record<string, unknown>;
}

function requiredString(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== "string") throw new Error("Dados inválidos.");
  return value;
}

export function parseCompanyInput(value: unknown): CompanyInput {
  const data = record(value);
  return {
    name: requiredString(data, "name"),
    taxId: requiredString(data, "taxId"),
    address: requiredString(data, "address"),
    phone: requiredString(data, "phone"),
  };
}

export function parsePaymentMethodInput(value: unknown): PaymentMethodInput {
  const data = record(value);
  return {
    label: requiredString(data, "label"),
    instructions: requiredString(data, "instructions"),
  };
}

export function parsePaymentMethodUpdate(value: unknown) {
  const data = record(value);
  const id = data.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1)
    throw new Error("Dados inválidos.");
  return { id, ...parsePaymentMethodInput(data) };
}
