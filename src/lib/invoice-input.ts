import * as v from "valibot";
import { isValidDay } from "./invoice-period";

const invalid = "Dados inválidos.";
const clientId = v.pipe(
  v.number(invalid),
  v.safeInteger(invalid),
  v.minValue(1, "Escolha um cliente cadastrado."),
);
const day = v.pipe(
  v.string(invalid),
  v.check(isValidDay, "Informe uma data válida no formato AAAA-MM-DD."),
);
const positiveInteger = v.pipe(
  v.number(invalid),
  v.safeInteger(invalid),
  v.minValue(1, invalid),
);

export const invoicePreviewSchema = v.pipe(
  v.object(
    {
      clientId,
      from: day,
      to: day,
      currency: v.picklist(["BRL", "USD"], "Escolha BRL ou USD."),
      exchangeRate: v.optional(v.pipe(v.string(invalid), v.trim()), ""),
      language: v.optional(v.picklist(["pt", "en"], invalid), "pt"),
    },
    invalid,
  ),
  v.check(
    (input) => input.from <= input.to,
    "A data inicial deve ser anterior ou igual à data final.",
  ),
);
export type InvoicePreviewInput = v.InferInput<typeof invoicePreviewSchema>;

const invoiceLineInputSchema = v.object(
  {
    projectId: positiveInteger,
    projectName: v.pipe(v.string(invalid), v.trim(), v.minLength(1, invalid)),
    hoursSeconds: v.pipe(
      v.number(invalid),
      v.safeInteger(invalid),
      v.minValue(1, invalid),
    ),
    subtotalCents: v.pipe(
      v.number(invalid),
      v.safeInteger(invalid),
      v.minValue(0, invalid),
    ),
    rateCents: v.nullable(v.pipe(v.number(invalid), v.safeInteger(invalid))),
    rateCurrency: v.nullable(v.picklist(["BRL", "USD"], invalid)),
    recordIds: v.pipe(
      v.array(positiveInteger, invalid),
      v.minLength(1, invalid),
    ),
    serviceDescription: v.pipe(
      v.string(invalid),
      v.trim(),
      v.minLength(1, "Informe a descrição do serviço."),
      v.maxLength(
        1000,
        "A descrição do serviço deve ter até 1.000 caracteres.",
      ),
    ),
  },
  invalid,
);

export const invoiceIssueSchema = v.object(
  {
    clientId,
    from: day,
    to: day,
    currency: v.picklist(["BRL", "USD"], "Escolha BRL ou USD."),
    exchangeRate: v.optional(v.pipe(v.string(invalid), v.trim()), ""),
    language: v.optional(v.picklist(["pt", "en"], invalid), "pt"),
    paymentMethodId: positiveInteger,
    numberStart: v.optional(positiveInteger, 1),
    expectedTimezone: v.pipe(v.string(invalid), v.minLength(1, invalid)),
    expectedTotalCents: v.pipe(
      v.number(invalid),
      v.safeInteger(invalid),
      v.minValue(0, invalid),
    ),
    expectedLines: v.pipe(
      v.array(invoiceLineInputSchema, invalid),
      v.minLength(1, "A prévia precisa conter horas elegíveis."),
    ),
  },
  invalid,
);
export type InvoiceIssueInput = v.InferInput<typeof invoiceIssueSchema>;
