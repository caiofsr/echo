import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import {
  hoursDateFormatter,
  hoursDisplayFormatter,
  hoursTimestamp,
} from "../../lib/hours-date";
import type { TimeRecordInput } from "../../lib/hours-input";
import type { Task } from "../../queries/board";
import type { Directory } from "../../queries/directory";
import { timerQueryOptions, type HoursRecord } from "../../queries/timer";
import { saveHoursRecord } from "../../server/functions/timer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

type Props = {
  record?: HoursRecord;
  timezone: string;
  directory: Directory;
  tasks: Task[];
  onClose: () => void;
};

export function HoursRecordForm({
  record,
  timezone,
  directory,
  tasks,
  onClose,
}: Props) {
  const id = useId();
  const client = useQueryClient();
  const [formTimezone] = useState(timezone);
  const localDate = hoursDateFormatter(formTimezone);
  const format = hoursDisplayFormatter(formTimezone);
  const [initial] = useState(() => ({
    version: record?.version,
    startedAt: record?.startedAt,
    endedAt: record?.endedAt ?? undefined,
    description: record?.description ?? "",
    start: record ? localDate(record.startedAt) : "",
    end: record?.endedAt != null ? localDate(record.endedAt) : "",
    task: record?.taskId?.toString() ?? "",
    project: record?.projectId?.toString() ?? "",
    client: record?.clientId?.toString() ?? "",
  }));
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const draftRef = useUnsavedChanges(
    Object.keys(form).some((key) => {
      const field = key as keyof typeof form;
      return form[field] !== initial[field];
    }),
  );

  const save = useMutation({
    retry: false,
    networkMode: "always",
    mutationFn: (data: TimeRecordInput) => {
      if (!navigator.onLine)
        throw new Error("Conecte-se para salvar o registro.");
      return saveHoursRecord({ data });
    },
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      return client.invalidateQueries({ queryKey: timerQueryOptions.queryKey });
    },
    onError: (error) =>
      setError(error.message || "Não foi possível salvar o registro."),
  });

  function update(patch: Partial<typeof form>) {
    setError("");
    setForm((current) => ({ ...current, ...patch }));
  }

  function projectAssociation(projectId: string) {
    const project = directory.projects.find(
      ({ id }) => String(id) === projectId,
    );
    return {
      project: projectId,
      client: project ? String(project.clientId) : "",
    };
  }

  return (
    <form
      ref={draftRef}
      className="settings-form hours-form"
      onSubmit={(event) => {
        event.preventDefault();
        const startedAt = hoursTimestamp(
          form.start,
          localDate,
          initial.startedAt,
        );
        const endedAt = hoursTimestamp(form.end, localDate, initial.endedAt);
        if (startedAt === null || endedAt === null) {
          setError("Informe horários válidos para o fuso selecionado.");
          return;
        }
        setError("");
        const fields = {
          startedAt,
          endedAt,
          description: form.description,
          projectId: form.project ? Number(form.project) : null,
          taskId: form.task ? Number(form.task) : null,
          clientId: form.client ? Number(form.client) : null,
        };
        save.mutate(
          record && initial.version !== undefined
            ? { ...fields, id: record.id, version: initial.version }
            : fields,
          {
            onSuccess: (result) => {
              if (result.ok) {
                onClose();
                return;
              }
              const conflict =
                "conflict" in result ? result.conflict : undefined;
              if (!conflict) {
                setError(result.message);
                return;
              }
              const name = conflict.description || `Registro #${conflict.id}`;
              const start = format.format(conflict.startedAt * 1000);
              const end =
                conflict.endedAt === null
                  ? "(em andamento)"
                  : `até ${format.format(conflict.endedAt * 1000)}`;
              setError(`${result.message} ${name}, de ${start} ${end}.`);
            },
          },
        );
      }}
    >
      <fieldset
        className="hours-fieldset settings-form-grid"
        disabled={save.isPending}
      >
        <label
          className="field settings-form-wide"
          htmlFor={id + "-description"}
        >
          Descrição
          <Input
            id={id + "-description"}
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        </label>
        <label className="field" htmlFor={id + "-start"}>
          Início
          <Input
            id={id + "-start"}
            type="datetime-local"
            step={1}
            required
            value={form.start}
            onChange={(event) => update({ start: event.target.value })}
          />
        </label>
        <label className="field" htmlFor={id + "-end"}>
          Fim
          <Input
            id={id + "-end"}
            type="datetime-local"
            step={1}
            required
            value={form.end}
            onChange={(event) => update({ end: event.target.value })}
          />
        </label>
        <label className="field" htmlFor={id + "-client"}>
          Cliente
          <Select
            id={id + "-client"}
            value={form.client}
            disabled={save.isPending || Boolean(form.project)}
            options={[
              { value: "", label: "Sem cliente" },
              ...directory.clients.map(({ id, name }) => ({
                value: String(id),
                label: name,
              })),
            ]}
            onValueChange={(client) => update({ client })}
          />
        </label>
        <label className="field" htmlFor={id + "-project"}>
          Projeto
          <Select
            id={id + "-project"}
            value={form.project}
            disabled={save.isPending}
            options={[
              { value: "", label: "Sem projeto" },
              ...directory.projects.map(({ id, name }) => ({
                value: String(id),
                label: name,
              })),
            ]}
            onValueChange={(project) => update(projectAssociation(project))}
          />
        </label>
        <label className="field settings-form-wide" htmlFor={id + "-task"}>
          Tarefa
          <Select
            id={id + "-task"}
            value={form.task}
            disabled={save.isPending}
            options={[
              { value: "", label: "Sem tarefa" },
              ...tasks.map(({ id, title }) => ({
                value: String(id),
                label: title,
              })),
            ]}
            onValueChange={(task) => {
              const linked = tasks.find(
                ({ id }) => String(id) === task,
              )?.projectId;
              update(
                linked && !form.project
                  ? { task, ...projectAssociation(String(linked)) }
                  : { task },
              );
            }}
          />
        </label>
      </fieldset>
      <p className="field-hint">
        Horários em {formTimezone}.
        {record && " O valor de hora e a moeda são preservados."}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending
            ? "Salvando…"
            : record
              ? "Salvar alterações"
              : "Salvar registro"}
        </Button>
      </div>
    </form>
  );
}
