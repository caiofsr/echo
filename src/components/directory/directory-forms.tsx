import {
  useState,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { useForm } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { useUnsavedChanges } from "../../hooks/use-unsaved-changes";
import {
  directoryQueryOptions,
  type Client,
  type Project,
} from "../../queries/directory";
import { saveClient, saveProject } from "../../server/functions/directory";
import {
  hourlyRateToCents,
  hourlyRateInputValue,
  type ClientInput,
  type ProjectInput,
} from "../../lib/directory-input";

type Callbacks = {
  onCancel: () => void;
  onSaved: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function ClientForm({
  client,
  onCancel,
  onSaved,
  returnFocus,
}: Callbacks & { client?: Client }) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveClient);
  const [version, setVersion] = useState(client?.version);
  const mutation = useMutation({
    mutationFn: (data: ClientInput) => save({ data }),
    onSuccess: (saved) => {
      queryClient.setQueryData(directoryQueryOptions.queryKey, (current) =>
        current
          ? {
              ...current,
              clients: [
                ...current.clients.filter((item) => item.id !== saved.id),
                saved,
              ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
            }
          : current,
      );
      onSaved();
      void queryClient.invalidateQueries({
        queryKey: directoryQueryOptions.queryKey,
      });
    },
  });
  const form = useForm({
    defaultValues: {
      name: client?.name ?? "",
      legalName: client?.legalName ?? "",
      taxId: client?.taxId ?? "",
      address: client?.address ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({ ...value, id: client?.id, version });
      } catch {
        /* The mutation error is shown in the dialog. */
      }
    },
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);
  return (
    <EntityDialog
      returnFocus={returnFocus}
      onRefresh={async () => {
        const fresh = await queryClient.fetchQuery({
          ...directoryQueryOptions,
          staleTime: 0,
        });
        const current = fresh.clients.find((item) => item.id === client?.id);
        if (!current) throw new Error("Cliente não encontrado.");
        for (const name of ["name", "legalName", "taxId", "address"] as const) {
          if (!form.getFieldMeta(name)?.isDirty)
            form.setFieldValue(name, current[name] ?? "");
        }
        setVersion(current.version);
        mutation.reset();
      }}
      title={client ? "Editar cliente" : "Novo cliente"}
      description="O nome de exibição é obrigatório. Os dados para fatura são opcionais."
      dirty={dirty}
      pending={mutation.isPending}
      error={mutation.error}
      onCancel={onCancel}
      onSubmit={() => form.handleSubmit()}
      draftRef={draftRef}
    >
      {(
        [
          { name: "name", label: "Nome de exibição", required: true },
          {
            name: "legalName",
            label: "Nome legal do destinatário",
            required: false,
          },
          { name: "taxId", label: "Identificação fiscal", required: false },
          { name: "address", label: "Endereço", required: false },
        ] as const
      ).map(({ name, label, required }) => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onSubmit: ({ value }) =>
              required && !value.trim()
                ? "Informe o nome de exibição do cliente."
                : undefined,
          }}
        >
          {(field) => (
            <Field
              label={label}
              id={`client-${name}`}
              required={required}
              error={field.state.meta.errors.join(" ")}
            >
              {name === "address" ? (
                <textarea
                  id={`client-${name}`}
                  name={name}
                  className="input settings-textarea"
                  rows={3}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                />
              ) : (
                <Input
                  id={`client-${name}`}
                  name={name}
                  autoFocus={name === "name"}
                  required={required}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-describedby={
                    field.state.meta.errors.length
                      ? `client-${name}-error`
                      : undefined
                  }
                />
              )}
            </Field>
          )}
        </form.Field>
      ))}
    </EntityDialog>
  );
}

export function ProjectForm({
  project,
  clients,
  onCancel,
  onSaved,
  returnFocus,
}: Callbacks & { project?: Project; clients: Client[] }) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveProject);
  const [version, setVersion] = useState(project?.version);
  const mutation = useMutation({
    mutationFn: (data: ProjectInput) => save({ data }),
    onSuccess: (saved) => {
      queryClient.setQueryData(directoryQueryOptions.queryKey, (current) =>
        current
          ? {
              ...current,
              projects: [
                ...current.projects.filter((item) => item.id !== saved.id),
                saved,
              ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
            }
          : current,
      );
      onSaved();
      void queryClient.invalidateQueries({
        queryKey: directoryQueryOptions.queryKey,
      });
    },
  });
  const form = useForm({
    defaultValues: {
      name: project?.name ?? "",
      clientId: project ? String(project.clientId) : "",
      hourlyRate: project ? hourlyRateInputValue(project.hourlyRateCents) : "",
      currency: project?.currency ?? "BRL",
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          ...value,
          id: project?.id,
          version,
          clientId: Number(value.clientId),
        });
      } catch {
        /* The mutation error is shown in the dialog. */
      }
    },
  });
  const dirty = useSelector(form.store, (state) => state.isDirty);
  const draftRef = useUnsavedChanges(dirty);
  return (
    <EntityDialog
      returnFocus={returnFocus}
      onRefresh={async () => {
        const fresh = await queryClient.fetchQuery({
          ...directoryQueryOptions,
          staleTime: 0,
        });
        const current = fresh.projects.find((item) => item.id === project?.id);
        if (!current) throw new Error("Projeto não encontrado.");
        const values = {
          name: current.name,
          clientId: String(current.clientId),
          hourlyRate: hourlyRateInputValue(current.hourlyRateCents),
          currency: current.currency,
        };
        for (const name of ["name", "clientId", "hourlyRate"] as const) {
          if (!form.getFieldMeta(name)?.isDirty)
            form.setFieldValue(name, values[name]);
        }
        if (!form.getFieldMeta("currency")?.isDirty)
          form.setFieldValue("currency", values.currency);
        setVersion(current.version);
        mutation.reset();
      }}
      title={project ? "Editar projeto" : "Novo projeto"}
      description="Vincule o projeto a um cliente e defina o valor de hora e a moeda de origem."
      dirty={dirty}
      pending={mutation.isPending}
      error={mutation.error}
      onCancel={onCancel}
      onSubmit={() => form.handleSubmit()}
      draftRef={draftRef}
    >
      <form.Field
        name="name"
        validators={{
          onSubmit: ({ value }) =>
            value.trim() ? undefined : "Informe o nome do projeto.",
        }}
      >
        {(field) => (
          <Field
            label="Nome do projeto"
            id="project-name"
            required
            error={field.state.meta.errors.join(" ")}
          >
            <Input
              id="project-name"
              name="name"
              autoFocus
              required
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={
                field.state.meta.errors.length
                  ? "project-name-error"
                  : undefined
              }
            />
          </Field>
        )}
      </form.Field>
      <form.Field
        name="clientId"
        validators={{
          onSubmit: ({ value }) => (value ? undefined : "Escolha um cliente."),
        }}
      >
        {(field) => (
          <Field
            label="Cliente"
            id="project-client"
            required
            error={field.state.meta.errors.join(" ")}
          >
            <select
              id="project-client"
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={
                field.state.meta.errors.length
                  ? "project-client-error"
                  : undefined
              }
              name="clientId"
              className="input"
              required
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </form.Field>
      <div className="settings-form-grid">
        <form.Field
          name="hourlyRate"
          validators={{
            onSubmit: ({ value }) => {
              try {
                hourlyRateToCents(value);
              } catch (error) {
                return error instanceof Error
                  ? error.message
                  : "Informe o valor de hora.";
              }
            },
          }}
        >
          {(field) => (
            <Field
              label="Valor de hora"
              id="project-rate"
              required
              error={field.state.meta.errors.join(" ")}
            >
              <Input
                id="project-rate"
                name="hourlyRate"
                inputMode="decimal"
                required
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                aria-describedby={
                  field.state.meta.errors.length
                    ? "project-rate-error"
                    : undefined
                }
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="currency">
          {(field) => (
            <Field label="Moeda de origem" id="project-currency" required>
              <select
                id="project-currency"
                name="currency"
                className="input"
                required
                value={field.state.value}
                onChange={(event) => {
                  if (
                    event.target.value === "BRL" ||
                    event.target.value === "USD"
                  )
                    field.handleChange(event.target.value);
                }}
                onBlur={field.handleBlur}
              >
                <option value="BRL">BRL · Real</option>
                <option value="USD">USD · Dólar americano</option>
              </select>
            </Field>
          )}
        </form.Field>
      </div>
    </EntityDialog>
  );
}

function EntityDialog({
  title,
  description,
  dirty,
  pending,
  error,
  onCancel,
  onSubmit,
  draftRef,
  children,
  returnFocus,
  onRefresh,
}: {
  returnFocus: RefObject<HTMLElement | null>;
  onRefresh: () => Promise<void>;
  title: string;
  description: string;
  dirty: boolean;
  pending: boolean;
  error: Error | null;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  draftRef: RefCallback<HTMLElement>;
  children: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  function close() {
    if (
      pending ||
      refreshing ||
      (dirty && !window.confirm("Descartar as alterações não salvas?"))
    )
      return;
    onCancel();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form
          className="settings-dialog-form"
          aria-label={title}
          ref={draftRef}
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <fieldset
            className="directory-fields"
            disabled={pending || refreshing}
          >
            {children}
          </fieldset>
          {error && (
            <p className="settings-error" role="alert">
              {error.message ||
                "Não foi possível salvar. Confira sua conexão e tente novamente."}
            </p>
          )}
          {refreshError && (
            <p className="settings-error" role="alert">
              {refreshError}
            </p>
          )}
          {refreshed && (
            <p role="status">
              Dados atualizados. Confira suas alterações antes de salvar
              novamente.
            </p>
          )}
          {error?.message.includes("alterado em outra sessão") && (
            <Button
              type="button"
              variant="outline"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                setRefreshError("");
                try {
                  await onRefresh();
                  setRefreshed(true);
                } catch {
                  setRefreshError(
                    "Não foi possível atualizar. Confira sua conexão e tente novamente.",
                  );
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              {refreshing ? "Atualizando…" : "Atualizar dados"}
            </Button>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={pending || refreshing}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || refreshing}
              onClick={close}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  required,
  error,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required-mark"> (obrigatório)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
