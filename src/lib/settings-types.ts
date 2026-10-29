export type CompanyInput = {
  name: string;
  taxId: string;
  address: string;
  phone: string;
};

export type Company = {
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
};

export type PaymentMethodInput = {
  label: string;
  instructions: string;
};

export type SavedPaymentMethod = PaymentMethodInput & { id: number };
