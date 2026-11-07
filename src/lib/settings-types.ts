import type { InferInput } from "valibot";
import type {
  companyInputSchema,
  paymentMethodInputSchema,
} from "./settings-input";

export type CompanyInput = InferInput<typeof companyInputSchema>;
export type Company = {
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
};
export type PaymentMethodInput = InferInput<typeof paymentMethodInputSchema>;
export type SavedPaymentMethod = PaymentMethodInput & { id: number };
