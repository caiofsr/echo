import { queryOptions } from "@tanstack/react-query";
import { getInvoices } from "../server/functions/invoices";

export const invoicesQueryOptions = queryOptions({
  queryKey: ["invoices"],
  queryFn: () => getInvoices(),
});

export type SavedInvoice = Awaited<ReturnType<typeof getInvoices>>[number];
