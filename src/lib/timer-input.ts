import * as v from "valibot";
export const preferencesSchema = v.object({
  hourlyRateCents: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
  currency: v.picklist(["BRL", "USD"]),
  timezone: v.pipe(
    v.string(),
    v.check((value) => {
      try {
        new Intl.DateTimeFormat("pt-BR", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Informe um fuso horário válido."),
  ),
});
export const timerCommandSchema = v.object({
  action: v.picklist(["start", "stop", "resume"]),
  version: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
});
export type Preferences = v.InferOutput<typeof preferencesSchema>;
export type TimerCommand = v.InferOutput<typeof timerCommandSchema>;
export function duration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
