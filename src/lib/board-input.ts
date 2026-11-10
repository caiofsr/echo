import * as v from "valibot";

const invalid = "Dados inválidos.";
const invalidId = "Identificador inválido.";
const text = v.pipe(v.string(invalid), v.trim());
const identifier = v.pipe(
  v.number(invalidId),
  v.safeInteger(invalidId),
  v.minValue(1, invalidId),
);
const identityFields = {
  id: v.optional(identifier),
  version: v.optional(identifier),
};

export const columnInputSchema = v.pipe(
  v.object(
    {
      ...identityFields,
      name: v.pipe(text, v.minLength(1, "Informe o nome da coluna.")),
    },
    invalid,
  ),
  v.check(
    (input) => input.id === undefined || input.version !== undefined,
    invalidId,
  ),
);
export type ColumnInput = v.InferInput<typeof columnInputSchema>;

export const columnOrderInputSchema = v.object(
  { columns: v.array(identifier, invalid) },
  invalid,
);
export type ColumnOrderInput = v.InferInput<typeof columnOrderInputSchema>;

export const taskInputSchema = v.pipe(
  v.object(
    {
      ...identityFields,
      title: v.pipe(text, v.minLength(1, "Informe o título da tarefa.")),
      description: v.optional(text),
      projectId: v.optional(v.union([v.null(), identifier], invalidId)),
      columnId: identifier,
    },
    invalid,
  ),
  v.check(
    (input) => input.id === undefined || input.version !== undefined,
    invalidId,
  ),
);
export type TaskInput = v.InferInput<typeof taskInputSchema>;

export const taskMoveInputSchema = v.object(
  {
    taskId: identifier,
    columnId: identifier,
    position: v.pipe(
      v.number(invalidId),
      v.safeInteger(invalidId),
      v.minValue(0, invalidId),
    ),
  },
  invalid,
);
export type TaskMoveInput = v.InferInput<typeof taskMoveInputSchema>;

export function parseColumnInput(value: unknown) {
  return v.parse(columnInputSchema, value);
}
export const columnRemovalInputSchema = v.object(
  {
    id: identifier,
  },
  invalid,
);
export type ColumnRemovalInput = v.InferInput<typeof columnRemovalInputSchema>;

export function parseColumnRemovalInput(value: unknown) {
  return v.parse(columnRemovalInputSchema, value);
}
export function parseColumnOrderInput(value: unknown) {
  return v.parse(columnOrderInputSchema, value);
}
export function parseTaskInput(value: unknown) {
  return v.parse(taskInputSchema, value);
}
export function parseTaskMoveInput(value: unknown) {
  return v.parse(taskMoveInputSchema, value);
}
