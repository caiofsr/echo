import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { boardQueryOptions } from "../../queries/board";
import { directoryQueryOptions } from "../../queries/directory";
import { timerQueryOptions, type HoursRecord } from "../../queries/timer";
import {
  filterHours,
  hoursDateFormatter,
  hoursDisplayFormatter,
} from "../../lib/hours-date";
import { duration } from "../../lib/timer-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { HoursRecordForm } from "./hours-record-form";

export function HoursPage() {
  const timer = useQuery(timerQueryOptions);
  const directory = useQuery(directoryQueryOptions);
  const board = useQuery(boardQueryOptions);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    client: "",
    project: "",
  });
  const [expanded, setExpanded] = useState<number[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const timezone = timer.data?.preferences.timezone;
  const formProps =
    timezone && directory.data && board.data
      ? { timezone, directory: directory.data, tasks: board.data.tasks }
      : null;
  const format = hoursDisplayFormatter(timezone);
  const records =
    timer.data && timezone
      ? filterHours(timer.data.records, filters, hoursDateFormatter(timezone))
      : [];
  const projects =
    directory.data?.projects.filter(
      (project) =>
        !filters.client ||
        String(project.clientId) === filters.client ||
        timer.data?.records.some(
          (record) =>
            record.projectId === project.id &&
            String(record.clientId) === filters.client,
        ),
    ) ?? [];

  function recordSummary(record: HoursRecord) {
    const value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: record.currency,
    }).format(record.hourlyRateCents / 100);
    const clientName = directory.data?.clients.find(
      ({ id }) => id === record.clientId,
    )?.name;
    return (
      <>
        <span className="hours-record-details">
          <strong>
            {record.description || record.taskTitle || "Trabalho livre"}
          </strong>
          <span>
            {record.projectName ?? "Sem projeto"}
            {clientName && ` · ${clientName}`}
            {record.taskTitle && record.description && ` · ${record.taskTitle}`}
          </span>
          <span>
            {format.format(record.startedAt * 1000)}
            {record.endedAt !== null &&
              ` até ${format.format(record.endedAt * 1000)}`}
          </span>
          <span>{value} / hora</span>
        </span>
        <strong className="hours-duration">
          {record.endedAt === null
            ? "Em andamento"
            : duration(record.endedAt - record.startedAt)}
        </strong>
      </>
    );
  }

  return (
    <section className="page-content">
      <div className="hours-heading">
        <h1>Horas</h1>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger render={<Button disabled={!formProps} />}>
            Registro manual
          </DialogTrigger>
          {formProps && manualOpen && (
            <DialogContent>
              <DialogTitle>Registro manual</DialogTitle>
              <DialogDescription>
                Informe o início e o fim do trabalho.
              </DialogDescription>
              <HoursRecordForm
                {...formProps}
                onClose={() => setManualOpen(false)}
              />
            </DialogContent>
          )}
        </Dialog>
      </div>
      <div className="hours-filters" role="group" aria-label="Filtros de horas">
        <label className="field" htmlFor="hours-from">
          De
          <Input
            id="hours-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) =>
              setFilters({ ...filters, from: event.target.value })
            }
          />
        </label>
        <label className="field" htmlFor="hours-to">
          Até
          <Input
            id="hours-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) =>
              setFilters({ ...filters, to: event.target.value })
            }
          />
        </label>
        <label className="field" htmlFor="hours-client">
          Cliente
          <Select
            id="hours-client"
            value={filters.client}
            disabled={!directory.data}
            options={[
              { value: "", label: "Todos os clientes" },
              ...(directory.data?.clients.map(({ id, name }) => ({
                value: String(id),
                label: name,
              })) ?? []),
            ]}
            onValueChange={(client) =>
              setFilters({ ...filters, client, project: "" })
            }
          />
        </label>
        <label className="field" htmlFor="hours-project">
          Projeto
          <Select
            id="hours-project"
            value={filters.project}
            disabled={!directory.data}
            options={[
              { value: "", label: "Todos os projetos" },
              ...projects.map(({ id, name }) => ({
                value: String(id),
                label: name,
              })),
            ]}
            onValueChange={(project) => setFilters({ ...filters, project })}
          />
        </label>
      </div>
      {(timer.isError || directory.isError || board.isError) && (
        <p role="alert">
          Não foi possível atualizar os dados de horas. Confira sua conexão.
        </p>
      )}
      {!timer.data && !timer.isError && <p>Carregando registros…</p>}
      {timer.data && records.length === 0 && (
        <div className="settings-empty">
          <h2>
            {timer.data.records.length
              ? "Nenhum registro para estes filtros"
              : "Nenhum período registrado"}
          </h2>
        </div>
      )}
      {records.length > 0 && (
        <Accordion
          className="hours-records"
          value={expanded}
          onValueChange={(value) => setExpanded(value)}
        >
          {records.map((record) =>
            record.endedAt === null || record.isInvoiced ? (
              <article
                key={record.id}
                className="hours-record hours-record-summary"
              >
                {recordSummary(record)}
                {record.isInvoiced && (
                  <span className="hours-invoice-lock">
                    Vinculado a uma fatura válida · edição bloqueada
                  </span>
                )}
              </article>
            ) : (
              <AccordionItem
                className="hours-record"
                key={record.id}
                value={record.id}
              >
                <AccordionTrigger
                  id={`hours-record-${record.id}`}
                  className="hours-record-summary"
                  disabled={!formProps}
                >
                  {recordSummary(record)}
                </AccordionTrigger>
                <AccordionContent className="hours-record-editor">
                  {formProps && expanded.includes(record.id) && (
                    <HoursRecordForm
                      {...formProps}
                      record={record}
                      onClose={() => {
                        setExpanded([]);
                        document
                          .querySelector<HTMLButtonElement>(
                            `#hours-record-${record.id}`,
                          )
                          ?.focus();
                      }}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            ),
          )}
        </Accordion>
      )}
    </section>
  );
}
