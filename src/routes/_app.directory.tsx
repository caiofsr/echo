import { createFileRoute } from "@tanstack/react-router";
import { DirectoryPage } from "../components/directory/directory-page";
import { directoryQueryOptions } from "../queries/directory";

export const Route = createFileRoute("/_app/directory")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(directoryQueryOptions),
  component: DirectoryPage,
});
