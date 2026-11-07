import { useRef, useState, type ReactNode, type RefObject } from "react";
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
  boardQueryOptions,
  type BoardColumn,
  type BoardProject,
  type Task,
} from "../../queries/board";
import {
  moveTask,
  removeColumn,
  reorderColumns,
  saveColumn,
  saveTask,
} from "../../server/functions/board";

type Callbacks = {
  onCancel: () => void;
  onSaved: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

function useBoardInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: boardQueryOptions.queryKey });
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
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ColumnCreateForm({
  onCancel,
  onSaved,
  returnFocus,
}: Callbacks) {
  const save = useServerFn(saveColumn);
  const invalidate = useBoardInvalidate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: { name: string }) => save({ data }),
    onSuccess: async () => {
      await invalidate();
      onSaved();
    },
  });
  const dirty = name.trim() !== "";
  const draftRef = useUnsavedChanges(dirty);
  const emptyName = !name.trim() ? "Informe o nome da coluna." : "";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>Nova coluna</DialogTitle>
        <DialogDescription>
          As colunas organizam as tarefas do quadro.
        </DialogDescription>
        <form
          className="settings-dialog-form"
          noValidate
          aria-label="Nova coluna"
          ref={draftRef}
          onSubmit={(event) => {
            const element = event.currentTarget;
            event.preventDefault();
            void (async () => {
              if (emptyName) {
                setError(emptyName);
                return;
              }
              try {
                await mutation.mutateAsync({ name: name.trim() });
              } catch {
                /* The mutation error is shown in the dialog. */
              }
            })().finally(() => {
              requestAnimationFrame(() => {
                element
                  .querySelector<HTMLElement>('[aria-invalid="true"]')
                  ?.focus();
              });
            });
          }}
        >
          <fieldset className="directory-fields" disabled={mutation.isPending}>
            <Field
              label="Nome da coluna"
              id="board-column-name"
              required
              error={error}
            >
              <Input
                id="board-column-name"
                name="name"
                autoFocus
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (event.target.value.trim()) setError("");
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "board-column-name-error" : undefined}
              />
            </Field>
          </fieldset>
          {mutation.error && (
            <p className="settings-error" role="alert">
              {mutation.error.message ||
                "Não foi possível salvar. Confira sua conexão e tente novamente."}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const connectionFallback =
  "Não foi possível salvar. Confira sua conexão e tente novamente.";

export function TaskForm({
  task,
  columnId,
  columns,
  projects,
  onCancel,
  onSaved,
  returnFocus,
}: Callbacks & {
  task?: Task;
  columnId?: number;
  columns: BoardColumn[];
  projects: BoardProject[];
}) {
  const save = useServerFn(saveTask);
  const queryClient = useQueryClient();
  const [version, setVersion] = useState(task?.version);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    projectId: task?.projectId != null ? String(task.projectId) : "",
  });
  const mutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      projectId: number | null;
      columnId: number;
    }) => save({ data: { ...data, id: task?.id, version } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: boardQueryOptions.queryKey,
      });
      onSaved();
    },
  });
  const dirty =
    values.title.trim() !== (task?.title ?? "") ||
    values.description !== (task?.description ?? "") ||
    values.projectId !== String(task?.projectId ?? "");
  const draftRef = useUnsavedChanges(dirty);
  const emptyTitle = !values.title.trim() ? "Informe o título da tarefa." : "";
  const targetColumnId = task?.columnId ?? columnId ?? columns[0]?.id ?? 0;
  const targetColumnName =
    columns.find((column) => column.id === targetColumnId)?.name ?? "—";
  const dialogError = refreshError || mutation.error?.message || "";
  async function refreshTask() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const fresh = await queryClient.fetchQuery({
        ...boardQueryOptions,
        staleTime: 0,
      });
      const current = fresh.tasks.find((item) => item.id === task?.id);
      if (!current) throw new Error("Tarefa não encontrada.");
      setValues({
        title: current.title,
        description: current.description ?? "",
        projectId: current.projectId != null ? String(current.projectId) : "",
      });
      setVersion(current.version);
      mutation.reset();
    } catch {
      setRefreshError(
        "Não foi possível atualizar. Confira sua conexão e tente novamente.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        <DialogDescription>
          O título é obrigatório. A descrição e o Projeto são opcionais.
        </DialogDescription>
        <form
          className="settings-dialog-form"
          noValidate
          aria-label={task ? "Editar tarefa" : "Nova tarefa"}
          ref={draftRef}
          onSubmit={(event) => {
            const element = event.currentTarget;
            event.preventDefault();
            void (async () => {
              if (emptyTitle) {
                setError(emptyTitle);
                return;
              }
              try {
                await mutation.mutateAsync({
                  title: values.title.trim(),
                  description: values.description,
                  projectId: values.projectId ? Number(values.projectId) : null,
                  columnId: targetColumnId,
                });
              } catch {
                /* The mutation error is shown in the dialog. */
              }
            })().finally(() => {
              requestAnimationFrame(() => {
                element
                  .querySelector<HTMLElement>('[aria-invalid="true"]')
                  ?.focus();
              });
            });
          }}
        >
          <fieldset
            className="directory-fields"
            disabled={mutation.isPending || refreshing}
          >
            <Field label="Título" id="board-task-title" required error={error}>
              <Input
                id="board-task-title"
                name="title"
                autoFocus
                required
                value={values.title}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                  if (event.target.value.trim()) setError("");
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "board-task-title-error" : undefined}
              />
            </Field>
            <Field label="Descrição" id="board-task-description">
              <textarea
                id="board-task-description"
                name="description"
                className="input settings-textarea"
                rows={3}
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Projeto" id="board-task-project">
              <select
                id="board-task-project"
                name="projectId"
                className="input"
                value={values.projectId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
              >
                <option value="">Sem projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            {task && (
              <p className="field-hint" id="board-task-column-note">
                Coluna: <strong>{targetColumnName}</strong>. Para trocar de
                coluna, use o botão “Mover” no card.
              </p>
            )}
          </fieldset>
          {dialogError && (
            <p className="settings-error" role="alert">
              {dialogError || connectionFallback}
            </p>
          )}
          {mutation.error?.message.includes("alterada em outra sessão") && (
            <Button
              type="button"
              variant="outline"
              disabled={refreshing || mutation.isPending}
              onClick={() => void refreshTask()}
            >
              {refreshing ? "Atualizando…" : "Atualizar dados"}
            </Button>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={mutation.isPending || refreshing}>
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending || refreshing}
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskMoveDialog({
  task,
  columns,
  tasks,
  onCancel,
  onSaved,
  returnFocus,
}: Callbacks & {
  task: Task;
  columns: BoardColumn[];
  tasks: Task[];
}) {
  const move = useServerFn(moveTask);
  const invalidate = useBoardInvalidate();
  const [columnId, setColumnId] = useState(task.columnId);
  const [position, setPosition] = useState(0);
  const mutation = useMutation({
    mutationFn: (data: {
      taskId: number;
      columnId: number;
      position: number;
    }) => move({ data }),
    onSuccess: async () => {
      await invalidate();
      onSaved();
    },
  });
  const candidates = tasks.filter(
    (item) => item.columnId === columnId && item.id !== task.id,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>Mover tarefa</DialogTitle>
        <DialogDescription>
          Escolha a coluna e a posição da tarefa “{task.title}”.
        </DialogDescription>
        <form
          className="settings-dialog-form"
          noValidate
          aria-label="Mover tarefa"
          onSubmit={(event) => {
            event.preventDefault();
            void mutation.mutateAsync({ taskId: task.id, columnId, position });
          }}
        >
          <fieldset className="directory-fields" disabled={mutation.isPending}>
            <Field label="Coluna" id="board-move-column">
              <select
                id="board-move-column"
                className="input"
                value={columnId}
                onChange={(event) => {
                  setColumnId(Number(event.target.value));
                  setPosition(0);
                }}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Posição" id="board-move-position">
              <select
                id="board-move-position"
                className="input"
                value={position}
                onChange={(event) => setPosition(Number(event.target.value))}
              >
                <option value={0}>Primeira</option>
                {candidates.map((candidate, index) => (
                  <option key={candidate.id} value={index + 1}>
                    Depois de {candidate.title}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>
          {mutation.error && (
            <p className="settings-error" role="alert">
              {mutation.error.message ||
                "Não foi possível mover. Confira sua conexão e tente novamente."}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Movendo…" : "Mover"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ColumnManagerDialog({
  columns,
  occupiedCounts,
  onCancel,
  onNotice,
  returnFocus,
}: {
  columns: BoardColumn[];
  occupiedCounts: Map<number, number>;
  onCancel: () => void;
  onNotice: (message: string) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const invalidate = useBoardInvalidate();
  const remove = useServerFn(removeColumn);
  const reorder = useServerFn(reorderColumns);
  const lastRemoved = useRef<BoardColumn | null>(null);
  const [order, setOrder] = useState(columns);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const reorderMutation = useMutation({
    mutationFn: (data: { columns: number[] }) => reorder({ data }),
    onSuccess: async () => {
      await invalidate();
      onNotice("Colunas reordenadas.");
    },
    onError: (cause) => {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a ordem. Confira sua conexão e tente novamente.",
      );
    },
  });
  const renameMutation = useMutation({
    mutationFn: (data: { id: number; version: number; name: string }) =>
      saveColumn({ data }),
    onSuccess: async (saved) => {
      setOrder((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[saved.id];
        return next;
      });
      await invalidate();
      onNotice("Coluna salva.");
    },
    onError: (cause) => {
      void scheduleConflictRefresh(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Confira sua conexão e tente novamente.",
      );
    },
  });
  const removeMutation = useMutation({
    mutationFn: (data: { id: number }) => remove({ data }),
    onSuccess: async () => {
      setOrder((current) =>
        current.filter((item) => item.id !== lastRemoved.current?.id),
      );
      await invalidate();
      onNotice("Coluna removida.");
    },
    onError: (cause) => {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover. Confira sua conexão e tente novamente.",
      );
    },
  });

  function occupiedLabel(columnId: number) {
    const quantidade = occupiedCounts.get(columnId) ?? 0;
    if (quantidade === 0) return "";
    return quantidade === 1 ? "1 tarefa" : `${quantidade} tarefas`;
  }

  async function persistOrder(next: BoardColumn[]) {
    setBusy(true);
    try {
      await reorderMutation.mutateAsync({
        columns: next.map((column) => column.id),
      });
    } finally {
      setBusy(false);
    }
  }

  function moveBy(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setOrder(next);
    void persistOrder(next);
  }

  async function commitRename(column: BoardColumn, draft: string) {
    const name = draft.trim();
    if (!name || name === column.name || renameMutation.isPending) return;
    setBusy(true);
    try {
      await renameMutation.mutateAsync({
        id: column.id,
        version: column.version,
        name,
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeConfirmed(column: BoardColumn) {
    setBusy(true);
    lastRemoved.current = column;
    try {
      await removeMutation.mutateAsync({ id: column.id });
    } finally {
      lastRemoved.current = null;
      setBusy(false);
    }
  }

  function scheduleConflictRefresh(cause: unknown) {
    if (
      cause instanceof Error &&
      cause.message.includes("alterada em outra sessão")
    ) {
      void invalidate().then(() => {
        setOrder(columns);
      });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent finalFocus={returnFocus}>
        <DialogTitle>Gerenciar colunas</DialogTitle>
        <DialogDescription>
          Reordene, renomeie ou remova colunas em lista compacta. Coluna com
          tarefa exige a movimentação das tarefas antes da remoção.
        </DialogDescription>
        <ul className="column-manager-list" aria-label="Colunas do quadro">
          {order.map((column, index) => {
            const occupied = occupiedLabel(column.id);
            return (
              <li
                key={column.id}
                className="column-manager-row"
                draggable={order.length > 1 && !busy}
                onDragStart={() => setDragIndex(index)}
                onDragEnter={() => {
                  if (dragIndex !== null && dragIndex !== index) {
                    setOrder((current) => {
                      const next = [...current];
                      const [moved] = next.splice(dragIndex, 1);
                      next.splice(index, 0, moved);
                      return next;
                    });
                    setDragIndex(index);
                    setOrderChanged(true);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={() => {
                  setDragIndex(null);
                  if (orderChanged) {
                    setOrderChanged(false);
                    void persistOrder(order);
                  }
                }}
              >
                <span className="column-manager-grip" aria-hidden="true">
                  ⋮⋮
                </span>
                <Input
                  className="column-manager-name"
                  aria-label={`Nome da coluna ${column.name}`}
                  disabled={busy}
                  value={drafts[column.id] ?? column.name}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [column.id]: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    void commitRename(column, drafts[column.id] ?? column.name)
                  }
                />
                <span className="column-manager-tools">
                  <button
                    type="button"
                    className="column-manager-move"
                    aria-label={`Mover coluna ${column.name} para cima`}
                    disabled={index === 0 || busy}
                    onClick={() => moveBy(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="column-manager-move"
                    aria-label={`Mover coluna ${column.name} para baixo`}
                    disabled={index === order.length - 1 || busy}
                    onClick={() => moveBy(index, 1)}
                  >
                    ↓
                  </button>
                </span>
                <span className="column-manager-count">{occupied}</span>
                <button
                  type="button"
                  className="column-manager-remove"
                  aria-label={`Remover coluna ${column.name}`}
                  disabled={Boolean(occupied) || busy}
                  onClick={() => void removeConfirmed(column)}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
        <p className="field-hint">
          Arraste pelo índice do quadro ou use as setas para ordenar com o
          teclado.
        </p>
        {error && (
          <p className="settings-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
