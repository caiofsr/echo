import type { InferInput } from "valibot";
import type { companyInputSchema } from "../../lib/settings-input";

export type CompanyInput = InferInput<typeof companyInputSchema>;

export type Company = {
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
};

export type SavedCompany = Company & { id: string };
