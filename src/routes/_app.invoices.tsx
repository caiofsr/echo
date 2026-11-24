import { createFileRoute } from "@tanstack/react-router";
import { InvoicesPage } from "../components/invoices/invoices-page";
import { directoryQueryOptions } from "../queries/directory";
import { settingsQueryOptions } from "../queries/settings";

export const Route = createFileRoute("/_app/invoices")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(directoryQueryOptions),
      context.queryClient.ensureQueryData(settingsQueryOptions),
    ]),
  component: InvoicesPage,
});
