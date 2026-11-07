import * as v from "valibot";

const invalid = "Dados inválidos.";
const invalidId = "Identificador inválido.";
const text = v.pipe(v.string(invalid), v.trim());
const directoryId = v.pipe(
  v.number(invalidId),
  v.safeInteger(invalidId),
  v.minValue(1, invalidId),
);
const identityFields = {
  id: v.optional(directoryId),
  version: v.optional(directoryId),
};

function centsFromHourlyRate(rate: string) {
  const [whole, fraction = ""] = rate.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const hourlyRateSchema = v.pipe(
  text,
  v.regex(
    /^\d+(?:[.,]\d{1,2})?$/,
    "Informe um valor de hora não negativo com até duas casas decimais.",
  ),
  v.check(
    (rate) => Number.isSafeInteger(centsFromHourlyRate(rate)),
    "O valor de hora é muito alto.",
  ),
);

export const clientInputSchema = v.pipe(
  v.object(
    {
      ...identityFields,
      name: v.pipe(
        text,
        v.minLength(1, "Informe o nome de exibição do cliente."),
      ),
      legalName: text,
      taxId: text,
      address: text,
    },
    invalid,
  ),
  v.check(
    (input) => input.id === undefined || input.version !== undefined,
    invalidId,
  ),
);
export type ClientInput = v.InferInput<typeof clientInputSchema>;

export const projectInputSchema = v.pipe(
  v.object(
    {
      ...identityFields,
      name: v.pipe(text, v.minLength(1, "Informe o nome do projeto.")),
      clientId: directoryId,
      hourlyRate: hourlyRateSchema,
      currency: v.picklist(["BRL", "USD"], "Escolha BRL ou USD."),
    },
    invalid,
  ),
  v.check(
    (input) => input.id === undefined || input.version !== undefined,
    invalidId,
  ),
);
export type ProjectInput = v.InferInput<typeof projectInputSchema>;

export function parseClientInput(value: unknown) {
  return v.parse(clientInputSchema, value);
}
export function parseProjectInput(value: unknown) {
  return v.parse(projectInputSchema, value);
}
export function hourlyRateToCents(rate: string) {
  return centsFromHourlyRate(v.parse(hourlyRateSchema, rate));
}

export function hourlyRateInputValue(cents: number) {
  return `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}

export function formatHourlyRate(cents: number, currency: "BRL" | "USD") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency })
    .formatToParts(Math.trunc(cents / 100))
    .map((part) =>
      part.type === "fraction"
        ? String(cents % 100).padStart(2, "0")
        : part.value,
    )
    .join("");
}
