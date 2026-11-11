import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { timerQueryOptions } from "../../queries/timer";
import { controlTimer } from "../../server/functions/timer";
import { duration, type TimerCommand } from "../../lib/timer-input";
import { Button } from "../ui/button";
import { EchoIcon } from "../ui/icons";

export function GlobalTimer() {
  const query = useQuery(timerQueryOptions);
  const client = useQueryClient();
  const control = useServerFn(controlTimer);
  const mutation = useMutation({
    mutationFn: async (action: TimerCommand["action"]) => {
      // TanStack mutations must fail immediately offline, never pause for replay.
      if (!navigator.onLine)
        throw new Error(
          "Conecte-se para controlar o cronômetro. A contagem em andamento continua.",
        );
      if (!query.data) throw new Error("Aguarde a atualização do cronômetro.");
      return control({ data: { action, version: query.data.version } });
    },
    networkMode: "always",
    retry: false,
    onSuccess: (result, action) => {
      const message =
        result.ok && action === "resume"
          ? "Trabalho livre retomado."
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
  useEffect(() => {
    if (query.isError)
      toast.error("Não foi possível atualizar o cronômetro", {
        id: "timer-connection",
        description: "Confira sua conexão. A contagem em andamento continua.",
        duration: 8000,
      });
    else toast.dismiss("timer-connection");
  }, [query.isError]);
  const data = query.data;
  return (
    <section
      className="timer-placeholder global-timer"
      aria-label="Cronômetro global"
    >
      <EchoIcon name="timer" size={32} />
      <div className="timer-copy">
        <strong>
          {data?.active ? "Trabalho livre em andamento" : "Cronômetro global"}
        </strong>
        <p>
          {data?.active
            ? "Sem tarefa ou projeto"
            : "Comece agora e organize depois."}
        </p>
      </div>
      <TimerDigits
        key={query.dataUpdatedAt}
        initial={
          data
            ? data.active
              ? data.serverNow - data.active.startedAt
              : 0
            : null
        }
        running={Boolean(data?.active)}
      />
      <div className="timer-controls">
        <Button
          disabled={!data || mutation.isPending || query.isError}
          onClick={() => mutation.mutate(data?.active ? "stop" : "start")}
        >
          {data?.active ? "Parar" : "Iniciar"}
        </Button>
        {data && !data.active && data.records.length > 0 && (
          <Button
            variant="outline"
            disabled={mutation.isPending || query.isError}
            onClick={() => mutation.mutate("resume")}
          >
            Retomar trabalho livre
          </Button>
        )}
      </div>
    </section>
  );
}

function TimerDigits({
  initial,
  running,
}: {
  initial: number | null;
  running: boolean;
}) {
  const [baseline] = useState(() => performance.now());
  const [tick, setTick] = useState(baseline);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick(performance.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return (
    <span className="timer-digits" aria-label="Tempo em andamento">
      {initial === null
        ? "—:—:—"
        : duration(initial + (running ? (tick - baseline) / 1000 : 0))}
    </span>
  );
}
