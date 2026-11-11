import { createServerFn } from "@tanstack/react-start";
import { requireSessionMiddleware } from "../middleware/auth";
import { db } from "../../db";
import { createTimerStore } from "../timer";
import { preferencesSchema, timerCommandSchema } from "../../lib/timer-input";
export const getTimer = createServerFn({ method: "GET" })
  .middleware([requireSessionMiddleware])
  .handler(() => createTimerStore(db).getState());
export const controlTimer = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(timerCommandSchema)
  .handler(({ data }) => createTimerStore(db).command(data));
export const saveTimerPreferences = createServerFn({ method: "POST" })
  .middleware([requireSessionMiddleware])
  .validator(preferencesSchema)
  .handler(({ data }) => createTimerStore(db).savePreferences(data));
