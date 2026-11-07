import * as v from "valibot";

const invalid = "Dados inválidos.";
const optionalText = v.pipe(v.string(invalid), v.trim());

export const companyNameSchema = v.pipe(
  v.string(invalid),
  v.trim(),
  v.minLength(1, "Informe o nome ou a razão social."),
);
export const paymentLabelSchema = v.pipe(
  v.string(invalid),
  v.trim(),
  v.minLength(1, "Informe um rótulo."),
);
export const paymentInstructionsSchema = v.pipe(
  v.string(invalid),
  v.trim(),
  v.minLength(1, "Informe as instruções de recebimento."),
);

export const companyInputSchema = v.object(
  {
    name: companyNameSchema,
    taxId: optionalText,
    address: optionalText,
    phone: optionalText,
  },
  invalid,
);

const paymentFields = {
  label: paymentLabelSchema,
  instructions: paymentInstructionsSchema,
};
const paymentId = v.pipe(
  v.number(invalid),
  v.safeInteger(invalid),
  v.minValue(1, invalid),
);

export const paymentMethodInputSchema = v.object(paymentFields, invalid);
export const paymentMethodUpdateSchema = v.object(
  { id: paymentId, ...paymentFields },
  invalid,
);
