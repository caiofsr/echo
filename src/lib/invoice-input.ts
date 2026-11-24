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
