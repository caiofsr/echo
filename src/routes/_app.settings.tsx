import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../components/settings/settings-page";
import { settingsQueryOptions } from "../queries/settings";

export const Route = createFileRoute("/_app/settings")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(settingsQueryOptions),
  component: SettingsPage,
});
