import type { InferInput } from "valibot";
import type { paymentMethodInputSchema } from "../../lib/settings-input";

export type PaymentMethodInput = InferInput<typeof paymentMethodInputSchema>;

export type SavedPaymentMethod = PaymentMethodInput & {
  id: number;
  archived: boolean;
};
