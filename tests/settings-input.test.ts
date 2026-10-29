import { expect, test } from "bun:test";
import * as v from "valibot";
import {
  companyInputSchema,
  companyUpdateSchema,
  paymentMethodInputSchema,
  paymentMethodUpdateSchema,
  paymentMethodArchiveSchema,
} from "../src/lib/settings-input";

test("schemas validam e normalizam os campos obrigatórios", () => {
  expect(
    v.parse(companyInputSchema, {
      name: "  Empresa  ",
      taxId: "",
      address: "",
      phone: "",
    }).name,
  ).toBe("Empresa");
  expect(
    v.safeParse(companyInputSchema, {
      name: "  ",
      taxId: "",
      address: "",
      phone: "",
    }).issues?.[0]?.message,
  ).toBe("Informe o nome ou a razão social.");
  expect(
    v.parse(paymentMethodInputSchema, {
      label: " PIX ",
      instructions: " Chave ",
    }),
  ).toEqual({ label: "PIX", instructions: "Chave" });
  expect(
    v.safeParse(paymentMethodInputSchema, { label: "PIX", instructions: "  " })
      .issues?.[0]?.message,
  ).toBe("Informe as instruções de recebimento.");
});

test("schemas rejeitam identificadores e estados inválidos", () => {
  const company = { name: "Empresa", taxId: "", address: "", phone: "" };
  expect(
    v.safeParse(companyUpdateSchema, { ...company, id: " " }).success,
  ).toBe(false);
  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1"]) {
    expect(
      v.safeParse(paymentMethodUpdateSchema, {
        id,
        label: "PIX",
        instructions: "Chave",
      }).success,
    ).toBe(false);
    expect(
      v.safeParse(paymentMethodArchiveSchema, { id, archived: true }).success,
    ).toBe(false);
  }
  expect(
    v.safeParse(paymentMethodArchiveSchema, { id: 1, archived: "true" })
      .success,
  ).toBe(false);
  expect(
    v.safeParse(companyInputSchema, { ...company, phone: 42 }).success,
  ).toBe(false);
});
