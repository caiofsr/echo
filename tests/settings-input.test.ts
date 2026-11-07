import { expect, test } from "bun:test";
import * as v from "valibot";
import {
  companyInputSchema,
  paymentMethodInputSchema,
  paymentMethodUpdateSchema,
} from "../src/lib/settings-input";

const company = {
  name: "  Empresa Exemplo  ",
  taxId: "",
  address: " Recife ",
  phone: "",
};

test("schemas de Configurações validam e normalizam campos compartilhados", () => {
  expect(v.parse(companyInputSchema, company)).toEqual({
    name: "Empresa Exemplo",
    taxId: "",
    address: "Recife",
    phone: "",
  });
  expect(
    v.parse(paymentMethodInputSchema, {
      label: " PIX ",
      instructions: " Chave de recebimento ",
    }),
  ).toEqual({ label: "PIX", instructions: "Chave de recebimento" });
  expect(
    v.parse(paymentMethodUpdateSchema, {
      id: 1,
      label: "PIX",
      instructions: "Chave",
    }),
  ).toEqual({ id: 1, label: "PIX", instructions: "Chave" });
});

test("schemas de Configurações recusam entradas inválidas com mensagens em português", () => {
  for (const input of [null, [], {}, { ...company, phone: 123 }])
    expect(() => v.parse(companyInputSchema, input)).toThrow(
      "Dados inválidos.",
    );
  expect(() => v.parse(companyInputSchema, { ...company, name: " " })).toThrow(
    "Informe o nome ou a razão social.",
  );
  expect(() =>
    v.parse(paymentMethodInputSchema, { label: " ", instructions: "Chave" }),
  ).toThrow("Informe um rótulo.");
  expect(() =>
    v.parse(paymentMethodInputSchema, { label: "PIX", instructions: " " }),
  ).toThrow("Informe as instruções de recebimento.");
  for (const id of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "1",
  ])
    expect(() =>
      v.parse(paymentMethodUpdateSchema, {
        id,
        label: "PIX",
        instructions: "Chave",
      }),
    ).toThrow("Dados inválidos.");
});
