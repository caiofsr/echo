import { useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { boardQueryOptions, type Task } from "../../queries/board";
import { timerQueryOptions } from "../../queries/timer";
import { deleteTask, prepareTaskDeletion } from "../../server/functions/board";

type Choice = "preserve" | "delete";

export function DeleteTaskDialog({
  task,
  onClose,
  returnFocus,
}: {
  task: Task;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [confirming, setConfirming] = useState(false);
  const client = useQueryClient();
  const prepare = useServerFn(prepareTaskDeletion);
  const remove = useServerFn(deleteTask);
  const previewQuery = useQuery({
    queryKey: ["task-deletion-preview", task.id, task.version],
    queryFn: () => prepare({ data: { id: task.id, version: task.version } }),
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: () => {
      const preview = previewQuery.data;
      if (!preview || preview.status !== "ready" || !choice)
        throw new Error("Atualize os dados da tarefa e tente novamente.");
      return remove({
        data: {
          id: task.id,
          version: task.version,
          timerVersion: preview.timerVersion,
          records: preview.records,
          deleteHours: choice === "delete",
        },
      });
    },
    onSuccess: async (result) => {
      if (result.status === "conflict") {
        toast.warning(
          "Os dados mudaram em outra sessão. Confira a prévia e confirme novamente.",
        );
        setChoice(null);
        setConfirming(false);
        await previewQuery.refetch();
        return;
      }
      if (result.status === "blocked") {
        toast.warning(
          "Tarefas arquivadas são consideradas concluídas e não podem ser excluídas.",
        );
        onClose();
        return;
      }
      await Promise.all(
        [boardQueryOptions, timerQueryOptions].map(({ queryKey }) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
      toast.success("Tarefa excluída.");
      onClose();
    },
    onError: () =>
      toast.error(
        "Não foi possível excluir a tarefa. O cronômetro e os dados foram preservados.",
      ),
  });

  const preview = previewQuery.data;
  const ready = preview?.status === "ready" ? preview : null;
  const busy = previewQuery.isPending || mutation.isPending;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>Excluir {task.title}?</DialogTitle>
        <DialogDescription>
          A exclusão da Tarefa é permanente. Primeiro escolha o que fazer com as
          horas.
        </DialogDescription>
        {previewQuery.isPending && (
          <p role="status">Conferindo os registros de horas…</p>
        )}
        {previewQuery.isError && (
          <p role="alert">
            Não foi possível conferir os registros. Tente novamente.
          </p>
        )}
        {preview?.status === "blocked" && (
          <p role="alert">
            Tarefas arquivadas são consideradas concluídas e não podem ser
            excluídas.
          </p>
        )}
        {preview?.status === "conflict" && (
          <p role="alert">
            A tarefa mudou em outra sessão. Atualize o quadro e tente novamente.
          </p>
        )}
        {ready && !confirming && (
          <section
            className="task-delete-choice"
            aria-label="Escolher o destino das horas"
          >
            <Button
              type="button"
              variant={choice === "preserve" ? "default" : "outline"}
              aria-pressed={choice === "preserve"}
              onClick={() => setChoice("preserve")}
              disabled={busy}
            >
              Preservar as horas
            </Button>
            <Button
              type="button"
              variant={choice === "delete" ? "destructive" : "outline"}
              aria-pressed={choice === "delete"}
              onClick={() => setChoice("delete")}
              disabled={busy}
            >
              Apagar as horas
            </Button>
            <p>
              {ready.recordCount === 1
                ? "1 registro de horas está associado a esta tarefa."
                : `${ready.recordCount} registros de horas estão associados a esta tarefa.`}
            </p>
            {ready.activeRecordCount > 0 && (
              <p role="status">
                O cronômetro está contando nesta tarefa. Ao confirmar, o período
                será salvo e seguirá a opção escolhida.
              </p>
            )}
          </section>
        )}
        {ready && confirming && choice && (
          <section
            className="task-delete-confirmation"
            aria-label="Consequências da exclusão"
          >
            {choice === "preserve" ? (
              <p>
                {ready.recordCount === 0
                  ? "A tarefa será excluída sem alterar registros de horas."
                  : `${ready.recordCount} ${ready.recordCount === 1 ? "registro será preservado" : "registros serão preservados"} sem vínculo com a tarefa.`}
              </p>
            ) : (
              <>
                <p>
                  {ready.recordCount === 0
                    ? "A tarefa será excluída sem registros de horas associados."
                    : `${ready.recordCount} ${ready.recordCount === 1 ? "registro de horas será apagado" : "registros de horas serão apagados"}.`}
                </p>
                <p>
                  Registros vinculados a faturas válidas serão preservados e
                  desvinculados; as faturas não serão alteradas.
                </p>
              </>
            )}
            {ready.activeRecordCount > 0 && (
              <p>O período atual será encerrado na mesma operação.</p>
            )}
          </section>
        )}
        <div className="task-details-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          {ready && !confirming && (
            <Button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!choice || busy}
            >
              Continuar
            </Button>
          )}
          {ready && confirming && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={mutation.isPending}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {ready.activeRecordCount > 0
                  ? "Salvar período e excluir tarefa"
                  : "Excluir tarefa permanentemente"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
