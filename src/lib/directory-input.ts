function record(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Dados inválidos.");
  return value as Record<string, unknown>;
}
function text(data: Record<string, unknown>, key: string) {
  if (typeof data[key] !== "string") throw new Error("Dados inválidos.");
  return data[key].trim();
}
export function parseDirectoryId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new Error("Identificador inválido.");
  return value;
}
export function parseClientInput(value: unknown) {
  const data = record(value);
  const name = text(data, "name");
  if (!name) throw new Error("Informe o nome de exibição do cliente.");
  return {
    ...parseIdentity(data),
    name,
    legalName: text(data, "legalName"),
    taxId: text(data, "taxId"),
    address: text(data, "address"),
  };
}
export type ClientInput = {
  id?: number;
  version?: number;
  name: string;
  legalName: string;
  taxId: string;
  address: string;
};

export function parseProjectInput(value: unknown) {
  const data = record(value);
  const name = text(data, "name");
  if (!name) throw new Error("Informe o nome do projeto.");
  const clientId = parseDirectoryId(data.clientId);
  const rate = text(data, "hourlyRate");
  hourlyRateToCents(rate);
  const currency = data.currency;
  if (currency !== "BRL" && currency !== "USD")
    throw new Error("Escolha BRL ou USD.");
  return {
    ...parseIdentity(data),
    name,
    clientId,
    hourlyRate: rate,
    currency,
  } as const;
}
export type ProjectInput = {
  id?: number;
  version?: number;
  name: string;
  clientId: number;
  hourlyRate: string;
  currency: "BRL" | "USD";
};

export function hourlyRateToCents(rate: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(rate.trim()))
    throw new Error(
      "Informe um valor de hora não negativo com até duas casas decimais.",
    );
  const [whole, fraction = ""] = rate.trim().replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents))
    throw new Error("O valor de hora é muito alto.");
  return cents;
}

function parseIdentity(data: Record<string, unknown>) {
  return data.id === undefined
    ? {}
    : {
        id: parseDirectoryId(data.id),
        version: parseDirectoryId(data.version),
      };
}

export function hourlyRateInputValue(cents: number) {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
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
