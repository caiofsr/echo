import { useState, type RefObject } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { ArchiveInput } from "../../lib/archive-input";
import { boardQueryOptions } from "../../queries/board";
import { directoryQueryOptions } from "../../queries/directory";
import { timerQueryOptions } from "../../queries/timer";
import { changeArchive } from "../../server/functions/archive";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

export type ArchiveTarget = Omit<ArchiveInput, "confirmedRecordId"> & {
  name: string;
};

export function ArchiveDialog({
  target: { name, ...target },
  onClose,
  returnFocus,
}: {
  target: ArchiveTarget;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [recordId, setRecordId] = useState<number>();
  const client = useQueryClient();
  const change = useServerFn(changeArchive);
  const restoring = target.action === "restore";
  const label = restoring ? "Restaurar" : "Arquivar";
  const mutation = useMutation({
    mutationFn: () =>
      change({ data: { ...target, confirmedRecordId: recordId } }),
    networkMode: "always",
    onSuccess: async (result) => {
      if (result.status === "confirmation-required") {
        if (recordId !== undefined)
          toast.warning(
            "O período em andamento mudou. Confira o cronômetro e confirme novamente.",
          );
        setRecordId(result.recordId);
        return;
      }
      if (result.status === "blocked") {
        toast.warning(result.message);
        return;
      }
      await Promise.all(
        [boardQueryOptions, directoryQueryOptions, timerQueryOptions].map(
          ({ queryKey }) => client.invalidateQueries({ queryKey }),
        ),
      );
      if (result.status === "conflict")
        toast.warning(
          "O item mudou em outra sessão. Confira os dados e tente novamente.",
        );
      else
        toast.success(
          restoring ? "Restauração concluída." : "Arquivamento concluído.",
        );
      onClose();
    },
    onError: () =>
      toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>
          {label} {name}
        </DialogTitle>
        <DialogDescription>
          {recordId !== undefined
            ? "Há um período em andamento vinculado a este trabalho. Salve o período e pare o cronômetro para arquivar."
            : restoring
              ? "Os itens arquivados junto com este trabalho também serão restaurados."
              : "Os registros de horas serão preservados."}
        </DialogDescription>
        <div className="mt-6 flex flex-wrap justify-end gap-2 max-[480px]:flex-col">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {recordId === undefined ? label : "Salvar período e arquivar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
