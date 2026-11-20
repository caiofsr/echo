import { useTimerControl } from "../../hooks/use-timer-control";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { duration } from "../../lib/timer-input";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { EchoIcon } from "../ui/icons";

export function GlobalTimer() {
  const { query, mutation } = useTimerControl();
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
          {data?.active
            ? (data.active.taskTitle ??
              data.active.description ??
              "Trabalho livre em andamento")
            : "Cronômetro global"}
        </strong>
        <p>
          {data?.active
            ? (data.active.projectName ?? "Sem projeto")
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
          onClick={() =>
            mutation.mutate({ action: data?.active ? "stop" : "start" })
          }
        >
          {data?.active ? "Parar" : "Iniciar"}
        </Button>
        {data && !data.active && data.lastTimedRecord && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  disabled={mutation.isPending || query.isError}
                  onClick={() => mutation.mutate({ action: "resume" })}
                >
                  {data.lastTimedRecord.taskId
                    ? "Retomar último"
                    : "Retomar trabalho livre"}
                </Button>
              }
            />
            <TooltipContent>
              {data.lastTimedRecord.taskTitle ??
                data.lastTimedRecord.description ??
                "Trabalho livre"}{" "}
              · {data.lastTimedRecord.projectName ?? "Sem projeto"}
            </TooltipContent>
          </Tooltip>
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
