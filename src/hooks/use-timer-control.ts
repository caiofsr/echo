import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { timerQueryOptions } from "../queries/timer";
import { controlTimer } from "../server/functions/timer";
import type { TimerCommand } from "../lib/timer-input";

export function useTimerControl() {
  const query = useQuery(timerQueryOptions);
  const client = useQueryClient();
  const control = useServerFn(controlTimer);
  const mutation = useMutation({
    mutationFn: async (command: Omit<TimerCommand, "version">) => {
      // TanStack mutations must fail immediately offline, never pause for replay.
      if (!navigator.onLine)
        throw new Error(
          "Conecte-se para controlar o cronômetro. A contagem em andamento continua.",
        );
      if (!query.data) throw new Error("Aguarde a atualização do cronômetro.");
      return control({ data: { ...command, version: query.data.version } });
    },
    networkMode: "always",
    retry: false,
    onSuccess: (result, command) => {
      const message =
        result.ok && command.action === "resume"
          ? query.data?.records[0]?.taskId
            ? "Atividade retomada."
            : "Trabalho livre retomado."
          : result.message;
      if (result.ok) toast.success(message);
      else toast.warning(message, { duration: 8000 });
    },
    onError: (error) =>
      toast.error("Não foi possível controlar o cronômetro", {
        description: error.message,
        duration: 8000,
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: timerQueryOptions.queryKey }),
  });
  return { query, mutation };
}
