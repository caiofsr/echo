import { useRef, useState, type DragEvent } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArchiveDialog, type ArchiveTarget } from "../archive/archive-dialog";
import { ArchiveFilter } from "../archive/archive-filter";
import { Button } from "../ui/button";
import { TimerActionIcon } from "../ui/timer-action-icon";
import {
  boardQueryOptions,
  type BoardColumn,
  type Task,
} from "../../queries/board";
import { moveTask } from "../../server/functions/board";
import {
  ColumnCreateForm,
  ColumnManagerDialog,
  TaskDetailsDialog,
  TaskForm,
  TaskMoveDialog,
} from "./board-dialogs";

import { TaskDeletionDialog } from "./task-deletion-dialog";
import { useTimerControl } from "../../hooks/use-timer-control";
import { duration } from "../../lib/timer-input";

type Editor =
  | { kind: "column-create" }
  | { kind: "columns" }
  | { kind: "task-create"; columnId: number }
  | { kind: "task-details"; task: Task }
  | { kind: "task-edit"; task: Task }
  | { kind: "task-move"; task: Task }
  | { kind: "task-delete"; task: Task };

export function BoardPage() {
  const timer = useTimerControl();
  const { data } = useSuspenseQuery(boardQueryOptions);
  const queryClient = useQueryClient();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropTarget, setDropTarget] = useState<{
    columnId: number;
    index: number;
  } | null>(null);
  const draggedTask = useRef<Task | null>(null);
  const move = useServerFn(moveTask);
  const moveMutation = useMutation({
    mutationFn: (data: {
      taskId: number;
      columnId: number;
      position: number;
    }) => move({ data }),
    onMutate: async () => {
      draggedTask.current = null;
      setDropTarget(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: boardQueryOptions.queryKey,
      });
      setNotice("Tarefa movida.");
    },
    onError: () => {
      draggedTask.current = null;
      setNotice("Não foi possível mover a tarefa. Tente novamente.");
    },
  });

  const taskSeconds = new Map<number, number>();
  for (const record of timer.query.data?.records ?? []) {
    if (record.taskId === null) continue;
    const end = record.endedAt ?? timer.query.data!.serverNow;
    taskSeconds.set(
      record.taskId,
      (taskSeconds.get(record.taskId) ?? 0) + end - record.startedAt,
    );
  }
  const columns = data.columns;
  const projects = data.projects.filter(
    (project) => project.archiveBatch === null,
  );
  const projectNames = new Map(
    data.projects.map((item) => [item.id, item.name]),
  );
  const tasksByColumn = new Map<number, Task[]>();
  const visibleTasks = data.tasks.filter(
    (task) => (task.archiveBatch !== null) === showArchived,
  );
  for (const task of visibleTasks) {
    const list = tasksByColumn.get(task.columnId) ?? [];
    list.push(task);
    tasksByColumn.set(task.columnId, list);
  }
  const activeMobileIndex = Math.max(
    0,
    Math.min(activeIndex, columns.length - 1),
  );

  function dropTaskOnColumn(column: BoardColumn) {
    const target = dropTarget;
    setDropTarget(null);
    const task = draggedTask.current;
    draggedTask.current = null;
    if (!target || !task) return;
    void moveMutation.mutateAsync({
      taskId: task.id,
      columnId: column.id,
      position: target.index,
    });
  }

  function handleColumnDragOver(
    column: BoardColumn,
    event: DragEvent<HTMLElement>,
  ) {
    if (!draggedTask.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const cards = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-task-card]"),
    );
    let at = cards.length;
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        at = i;
        break;
      }
    }
    setDropTarget({ columnId: column.id, index: at });
  }

  function saved(message: string) {
    setEditor(null);
    setNotice(message);
  }

  return (
    <section className="page-content board-page">
      <h1>Quadro</h1>
      <p className="settings-success" role="status">
        {notice}
      </p>
      <div className="board-toolbar">
        <p className="settings-intro">
          Organize as tarefas em colunas e acompanhe o trabalho em andamento.
        </p>
        <div className="board-toolbar-actions">
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setEditor({ kind: "column-create" });
            }}
          >
            Nova coluna
          </Button>
          <Button
            variant="outline"
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setEditor({ kind: "columns" });
            }}
          >
            Gerenciar colunas
          </Button>
          <ArchiveFilter
            id="board-task-status"
            label="Filtrar tarefas"
            activeLabel="Ativas"
            archivedLabel="Arquivadas"
            archived={showArchived}
            onChange={setShowArchived}
          />
        </div>
      </div>
      {columns.length === 0 ? (
        <div className="settings-empty">
          <h3>Nenhuma coluna no quadro</h3>
          <p>Crie uma coluna para adicionar a primeira tarefa.</p>
        </div>
      ) : (
        <>
          <div
            className="board-switcher"
            role="group"
            aria-label="Coluna visível no celular"
          >
            {columns.map((column, index) => (
              <button
                key={column.id}
                type="button"
                aria-pressed={index === activeMobileIndex}
                onClick={() => setActiveIndex(index)}
              >
                {column.name}
              </button>
            ))}
          </div>
          <ul className="board-columns" aria-label="Colunas do quadro">
            {columns.map((column, index) => {
              const tasks = tasksByColumn.get(column.id) ?? [];
              return (
                <li
                  key={column.id}
                  className={[
                    "board-column",
                    index === activeMobileIndex ? "is-active" : "",
                    dropTarget?.columnId === column.id ? "is-drop-target" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(event) => handleColumnDragOver(column, event)}
                  onDragLeave={(event) => {
                    if (
                      dropTarget?.columnId === column.id &&
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      setDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void dropTaskOnColumn(column);
                  }}
                >
                  <header className="board-column-header">
                    <h2>{column.name}</h2>
                    <span className="board-column-count">{tasks.length}</span>
                  </header>
                  <ul
                    className="board-task-list"
                    aria-label={`Tarefas em ${column.name}`}
                  >
                    {dropTarget?.columnId === column.id && (
                      <li
                        className="board-drop-spot"
                        aria-hidden="true"
                        data-drop-at={dropTarget.index}
                      />
                    )}
                    {tasks.length === 0 &&
                      dropTarget?.columnId !== column.id && (
                        <li className="board-column-empty">Sem tarefas.</li>
                      )}
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="board-card-wrap"
                        data-task-card
                        data-running={
                          timer.query.data?.active?.taskId === task.id
                        }
                        draggable={!showArchived}
                        onDragStart={(event) => {
                          draggedTask.current = task;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(
                            "text/plain",
                            String(task.id),
                          );
                        }}
                        onDragEnd={() => {
                          draggedTask.current = null;
                          setDropTarget(null);
                        }}
                      >
                        <button
                          type="button"
                          className="board-card"
                          aria-label={task.title}
                          onClick={(event) => {
                            returnFocus.current = event.currentTarget;
                            setEditor({ kind: "task-details", task });
                          }}
                        >
                          <span className="board-card-title">{task.title}</span>
                          {task.description && (
                            <span className="board-card-description">
                              {task.description}
                            </span>
                          )}
                          {task.projectId != null && (
                            <span className="board-card-meta">
                              <span className="board-card-project">
                                {projectNames.get(task.projectId) ?? ""}
                              </span>
                            </span>
                          )}
                        </button>
                        <div className="board-card-timer">
                          <span aria-label={`Horas de ${task.title}`}>
                            {duration(taskSeconds.get(task.id) ?? 0)}
                          </span>
                          {!showArchived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="board-card-timer-action"
                              title={
                                timer.query.data?.active?.taskId === task.id
                                  ? "Parar"
                                  : "Iniciar"
                              }
                              aria-label={`${timer.query.data?.active?.taskId === task.id ? "Parar" : "Iniciar"} ${task.title}`}
                              disabled={
                                !timer.query.data ||
                                timer.query.isError ||
                                timer.mutation.isPending
                              }
                              onClick={() =>
                                timer.mutation.mutate(
                                  timer.query.data?.active?.taskId === task.id
                                    ? { action: "stop" }
                                    : { action: "start", taskId: task.id },
                                )
                              }
                            >
                              <TimerActionIcon
                                running={
                                  timer.query.data?.active?.taskId === task.id
                                }
                              />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!showArchived && (
                    <footer className="board-column-footer">
                      <button
                        type="button"
                        className="board-column-add"
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget;
                          setEditor({
                            kind: "task-create",
                            columnId: column.id,
                          });
                        }}
                      >
                        + Tarefa
                      </button>
                    </footer>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {editor?.kind === "column-create" && (
        <ColumnCreateForm
          returnFocus={returnFocus}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Coluna salva.")}
        />
      )}
      {editor?.kind === "columns" && (
        <ColumnManagerDialog
          returnFocus={returnFocus}
          columns={columns}
          occupiedCounts={
            new Map(
              columns.map((column) => [
                column.id,
                data.tasks.filter((task) => task.columnId === column.id).length,
              ]),
            )
          }
          onCancel={() => setEditor(null)}
          onNotice={setNotice}
        />
      )}
      {editor?.kind === "task-create" && (
        <TaskForm
          returnFocus={returnFocus}
          columns={columns}
          projects={projects}
          columnId={editor.columnId}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Tarefa salva.")}
        />
      )}
      {editor?.kind === "task-details" && (
        <TaskDetailsDialog
          returnFocus={returnFocus}
          task={editor.task}
          columnName={
            columns.find((column) => column.id === editor.task.columnId)
              ?.name ?? "—"
          }
          projectName={
            editor.task.projectId != null
              ? (projectNames.get(editor.task.projectId) ?? "Sem projeto")
              : "Sem projeto"
          }
          onCancel={() => setEditor(null)}
          onEdit={() => setEditor({ kind: "task-edit", task: editor.task })}
          onMove={() => setEditor({ kind: "task-move", task: editor.task })}
          onDelete={() => setEditor({ kind: "task-delete", task: editor.task })}
          onArchive={() => {
            setArchiveTarget({
              kind: "task",
              id: editor.task.id,
              version: editor.task.version,
              name: editor.task.title,
              action: editor.task.archiveBatch === null ? "archive" : "restore",
            });
            setEditor(null);
          }}
        />
      )}
      {editor?.kind === "task-edit" && (
        <TaskForm
          returnFocus={returnFocus}
          columns={columns}
          projects={projects}
          task={editor.task}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Tarefa salva.")}
        />
      )}
      {editor?.kind === "task-move" && (
        <TaskMoveDialog
          returnFocus={returnFocus}
          task={editor.task}
          columns={columns}
          tasks={visibleTasks}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Tarefa movida.")}
        />
      )}
      {editor?.kind === "task-delete" && (
        <TaskDeletionDialog
          task={editor.task}
          returnFocus={returnFocus}
          onClose={() => setEditor(null)}
        />
      )}
      {archiveTarget && (
        <ArchiveDialog
          target={archiveTarget}
          returnFocus={returnFocus}
          onClose={() => setArchiveTarget(null)}
        />
      )}
    </section>
  );
}
