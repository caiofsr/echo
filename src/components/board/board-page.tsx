import { useRef, useState, type DragEvent } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "../ui/button";
import {
  boardQueryOptions,
  type BoardColumn,
  type Task,
} from "../../queries/board";
import { moveTask } from "../../server/functions/board";
import {
  ColumnCreateForm,
  ColumnManagerDialog,
  TaskForm,
  TaskMoveDialog,
} from "./board-dialogs";

type Editor =
  | { kind: "column-create" }
  | { kind: "columns" }
  | { kind: "task-create"; columnId: number }
  | { kind: "task-edit"; task: Task }
  | { kind: "task-move"; task: Task };

export function BoardPage() {
  const { data } = useSuspenseQuery(boardQueryOptions);
  const queryClient = useQueryClient();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
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

  const columns = data.columns;
  const projects = data.projects;
  const projectNames = new Map(projects.map((item) => [item.id, item.name]));
  const tasksByColumn = new Map<number, Task[]>();
  for (const task of data.tasks) {
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
                        draggable
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
                        <div className="board-card">
                          <button
                            type="button"
                            className="board-card-title"
                            onClick={(event) => {
                              returnFocus.current = event.currentTarget;
                              setEditor({ kind: "task-edit", task });
                            }}
                          >
                            {task.title}
                          </button>
                          {task.description && (
                            <p className="board-card-description">
                              {task.description}
                            </p>
                          )}
                          <div className="board-card-meta">
                            {task.projectId != null && (
                              <span className="board-card-project">
                                {projectNames.get(task.projectId) ?? ""}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Mover tarefa ${task.title}`}
                              onClick={(event) => {
                                returnFocus.current = event.currentTarget;
                                setEditor({ kind: "task-move", task });
                              }}
                            >
                              Mover
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <footer className="board-column-footer">
                    <button
                      type="button"
                      className="board-column-add"
                      onClick={(event) => {
                        returnFocus.current = event.currentTarget;
                        setEditor({ kind: "task-create", columnId: column.id });
                      }}
                    >
                      + Tarefa
                    </button>
                  </footer>
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
                (tasksByColumn.get(column.id) ?? []).length,
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
          tasks={data.tasks}
          onCancel={() => setEditor(null)}
          onSaved={() => saved("Tarefa movida.")}
        />
      )}
    </section>
  );
}
