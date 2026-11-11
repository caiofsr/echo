import { useQuery } from "@tanstack/react-query";
import { timerQueryOptions } from "../../queries/timer";
import { duration } from "../../lib/timer-input";

export function HoursPage() {
  const { data, isError } = useQuery(timerQueryOptions);
  return (
    <section className="page-content">
      <h1>Horas</h1>
      <p>Períodos de trabalho livre salvos pelo cronômetro.</p>
      {isError && (
        <p role="alert">
          Não foi possível atualizar os registros. Confira sua conexão.
        </p>
      )}
      {!data ? (
        <p>Carregando registros…</p>
      ) : data.records.length === 0 ? (
        <div className="settings-empty">
          <h2>Nenhum período registrado</h2>
          <p>Inicie o cronômetro para registrar seu trabalho.</p>
        </div>
      ) : (
        <div className="hours-records">
          {data.records.map((record) => {
            const format = (value: number) =>
              new Intl.DateTimeFormat("pt-BR", {
                timeZone: data.preferences.timezone,
                dateStyle: "short",
                timeStyle: "medium",
              }).format(value * 1000);
            return (
              <article key={record.id} className="hours-record">
                <div>
                  <h2>Trabalho livre</h2>
                  <p>
                    {format(record.startedAt)} →{" "}
                    {record.endedAt === null
                      ? "Em andamento"
                      : format(record.endedAt)}
                  </p>
                  <p>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: record.currency,
                    }).format(record.hourlyRateCents / 100)}{" "}
                    / hora · {data.preferences.timezone}
                  </p>
                </div>
                <strong>
                  {record.endedAt === null
                    ? "Em andamento"
                    : duration(record.endedAt - record.startedAt)}
                </strong>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
