import { useEffect, useRef, useState, type RefObject } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { hoursDisplayFormatter } from "../../lib/hours-date";
import type { TaskDeletionSelection } from "../../lib/task-deletion-input";
import { boardQueryOptions, type Task } from "../../queries/board";
import { timerQueryOptions } from "../../queries/timer";
import {
  confirmTaskDeletion,
  previewTaskDeletion,
} from "../../server/functions/task-deletion";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

type Preview = Extract<
  Awaited<ReturnType<typeof previewTaskDeletion>>,
  { status: "ready" }
>;

export function TaskDeletionDialog({
  task,
  onClose,
  returnFocus,
}: {
  task: Task;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [confirmation, setConfirmation] = useState<{
    selection: TaskDeletionSelection;
    preview: Preview;
  } | null>(null);
  const [stale, setStale] = useState(false);
  const queryClient = useQueryClient();
  const preview = useServerFn(previewTaskDeletion);
  const confirm = useServerFn(confirmTaskDeletion);
  const reportError = () =>
    toast.error("Não foi possível concluir a ação. Tente novamente.");
  const refresh = async () => {
    await Promise.all(
      [boardQueryOptions, timerQueryOptions].map(({ queryKey }) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
    onClose();
  };
  const prepare = useMutation({
    networkMode: "always",
    mutationFn: (selection: TaskDeletionSelection) =>
      preview({ data: selection }),
    onSuccess: (result, selection) => {
      if (result.status === "ready")
        setConfirmation({ selection, preview: result });
      else setStale(true);
    },
    onError: reportError,
  });
  const remove = useMutation({
    networkMode: "always",
    mutationFn: confirm,
    onSuccess: async (result) => {
      if (result.status === "deleted") {
        toast.success("Tarefa excluída.");
        await refresh();
      } else setStale(true);
    },
    onError: reportError,
  });
  const title = useRef<HTMLHeadingElement>(null);
  const step = stale
    ? "Os dados mudaram"
    : confirmation
      ? "Confirmar exclusão"
      : "Excluir tarefa";
  useEffect(() => {
    title.current?.focus();
  }, [step]);
  const pending = prepare.isPending || remove.isPending;
  const choose = (hours: TaskDeletionSelection["hours"]) =>
    prepare.mutate({ id: task.id, version: task.version, hours });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle ref={title} tabIndex={-1}>
          {step}
        </DialogTitle>
        <DialogDescription role={stale ? "alert" : undefined}>
          {stale
            ? "Atualize o quadro e confira a tarefa e os registros antes de tentar novamente."
            : confirmation
              ? `A tarefa “${task.title}” será excluída permanentemente.`
              : `O que deseja fazer com os registros de horas de “${task.title}”?`}
        </DialogDescription>
        {stale ? (
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void refresh()}>Atualizar quadro</Button>
          </div>
        ) : confirmation ? (
          <>
            <DeletionRecords preview={confirmation.preview} />
            <div className="mt-6 flex flex-wrap justify-end gap-2 max-[480px]:flex-col">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setConfirmation(null)}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  remove.mutate({
                    data: {
                      ...confirmation.selection,
                      revision: confirmation.preview.revision,
                    },
                  })
                }
              >
                Excluir definitivamente
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3">
              Registros vinculados a faturas válidas sempre serão preservados.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2 max-[480px]:flex-col">
              <Button variant="ghost" disabled={pending} onClick={onClose}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => choose("keep")}
              >
                Preservar horas
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => choose("remove")}
              >
                Apagar horas
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeletionRecords({ preview }: { preview: Preview }) {
  const formatter = hoursDisplayFormatter(preview.timezone);
  if (!preview.records.length)
    return <p className="mt-3">Esta tarefa não tem registros de horas.</p>;

  return (
    <>
      {preview.records.some((record) => record.endedAt === null) && (
        <p className="mt-3">
          O cronômetro será parado e o período atual será salvo antes de aplicar
          a escolha.
        </p>
      )}
      <ul
        className="mt-3 max-h-[30vh] space-y-2 overflow-y-auto"
        aria-label="Registros de horas afetados"
        tabIndex={0}
      >
        {preview.records.map(({ id, startedAt, endedAt, remove, billed }) => (
          <li key={id}>
            <span className="block">
              {formatter.format(startedAt * 1000)} –{" "}
              {endedAt === null
                ? "Em andamento"
                : formatter.format(endedAt * 1000)}
            </span>
            <strong>
              {remove ? "Será apagado" : "Será mantido sem tarefa"}
            </strong>
            {billed && " · Vinculado a fatura válida"}
          </li>
        ))}
      </ul>
    </>
  );
}
