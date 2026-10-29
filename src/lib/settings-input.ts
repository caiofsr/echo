import * as v from "valibot";

const invalid = "Dados inválidos.";

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

const companyFields = {
  name: companyNameSchema,
  taxId: v.string(invalid),
  address: v.string(invalid),
  phone: v.string(invalid),
};
const paymentFields = {
  label: paymentLabelSchema,
  instructions: paymentInstructionsSchema,
};
const companyId = v.pipe(
  v.string(invalid),
  v.check((id) => id.trim().length > 0, invalid),
);
const paymentId = v.pipe(
  v.number(invalid),
  v.safeInteger(invalid),
  v.minValue(1, invalid),
);

export const companyInputSchema = v.object(companyFields, invalid);
export const companyUpdateSchema = v.object(
  { id: companyId, ...companyFields },
  invalid,
);
export const paymentMethodInputSchema = v.object(paymentFields, invalid);
export const paymentMethodUpdateSchema = v.object(
  { id: paymentId, ...paymentFields },
  invalid,
);
export const paymentMethodArchiveSchema = v.object(
  { id: paymentId, archived: v.boolean(invalid) },
  invalid,
);
