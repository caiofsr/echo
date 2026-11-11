import { useForm } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  hourlyRateInputValue,
  hourlyRateToCents,
} from "../../lib/directory-input";
import { timerQueryOptions } from "../../queries/timer";
import { saveTimerPreferences } from "../../server/functions/timer";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { Preferences } from "../../lib/timer-input";

export function TimerPreferences() {
  const { data, isError } = useQuery(timerQueryOptions);
  return data ? (
    <PreferencesForm initial={data.preferences} />
  ) : (
    <p role={isError ? "alert" : undefined}>
      {isError
        ? "Não foi possível carregar preferências. Confira sua conexão."
        : "Carregando preferências…"}
    </p>
  );
}
const formValues = (preferences: Preferences) => ({
  hourlyRate: hourlyRateInputValue(preferences.hourlyRateCents),
  currency: preferences.currency,
  timezone: preferences.timezone,
});
function PreferencesForm({ initial }: { initial: Preferences }) {
  const client = useQueryClient();
  const save = useServerFn(saveTimerPreferences);
  const mutation = useMutation({
    mutationFn: async (values: ReturnType<typeof formValues>) => {
      if (!navigator.onLine)
        throw new Error("Conecte-se para salvar as preferências.");
      await save({
        data: {
          hourlyRateCents: hourlyRateToCents(values.hourlyRate),
          currency: values.currency,
          timezone: values.timezone,
        },
      });
    },
    networkMode: "always",
    retry: false,
    onSuccess: async (_result, values) => {
      await client.invalidateQueries({ queryKey: timerQueryOptions.queryKey });
      form.reset(values);
    },
  });
  const form = useForm({
    defaultValues: formValues(initial),
    onSubmit: ({ value }) => mutation.mutateAsync(value),
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);
  return (
    <section className="settings-section">
      <h2>Preferências de trabalho</h2>
      <p>
        Valor e moeda serão copiados para novos períodos livres. O histórico
        mantém seus valores.
      </p>
      <form
        ref={draftRef}
        className="timer-preferences"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit().catch(() => {});
        }}
      >
        <form.Field name="hourlyRate">
          {(field) => (
            <label>
              Valor de hora padrão
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                inputMode="decimal"
                required
              />
            </label>
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <label>
              Moeda padrão
              <select
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value === "USD" ? "USD" : "BRL")
                }
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </label>
          )}
        </form.Field>
        <form.Field name="timezone">
          {(field) => (
            <label>
              Fuso horário
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="America/Recife"
                required
              />
            </label>
          )}
        </form.Field>
        <Button type="submit" disabled={mutation.isPending || !dirty}>
          Salvar preferências
        </Button>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        {mutation.isSuccess && !dirty && (
          <p role="status">Preferências salvas.</p>
        )}
      </form>
    </section>
  );
}
