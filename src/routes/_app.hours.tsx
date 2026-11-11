import { createFileRoute } from "@tanstack/react-router";
import { HoursPage } from "../components/timer/hours-page";
export const Route = createFileRoute("/_app/hours")({ component: HoursPage });
