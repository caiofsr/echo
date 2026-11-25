import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { directoryQueryOptions } from "../../queries/directory";
import {
  invoicesQueryOptions,
  type SavedInvoice,
} from "../../queries/invoices";
import { settingsQueryOptions } from "../../queries/settings";
import { timerQueryOptions } from "../../queries/timer";
import { formatCents } from "../../lib/invoice-math";
import { duration } from "../../lib/timer-input";
import { hoursDisplayFormatter } from "../../lib/hours-date";
import type {
  InvoiceIssueInput,
  InvoicePreviewInput,
} from "../../lib/invoice-input";
import { issueInvoice, previewInvoice } from "../../server/functions/invoices";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";

const currencyOptions = [
  { value: "BRL", label: "Real (BRL)" },
  { value: "USD", label: "Dólar (USD)" },
];
const languageOptions = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
];

type Form = {
  clientId: string;
  from: string;
  to: string;
  currency: "BRL" | "USD";
  exchangeRate: string;
  language: "pt" | "en";
  paymentMethodId: string;
  numberStart: string;
};

const initialForm: Form = {
  clientId: "",
  from: "",
  to: "",
  currency: "BRL",
  exchangeRate: "",
  language: "pt",
  paymentMethodId: "",
  numberStart: "1",
};

export function InvoicesPage() {
  const directory = useSuspenseQuery(directoryQueryOptions);
  const invoices = useSuspenseQuery(invoicesQueryOptions);
  const settings = useSuspenseQuery(settingsQueryOptions);
  const timer = useQuery(timerQueryOptions);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(initialForm);
  const [message, setMessage] = useState("");
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(
    null,
  );
  const preview = useMutation({
    mutationFn: (data: InvoicePreviewInput) => previewInvoice({ data }),
  });
  const emission = useMutation({
    mutationFn: (data: InvoiceIssueInput) => issueInvoice({ data }),
    onSuccess: async (issued) => {
      setConfirmIssueOpen(false);
      preview.reset();
      toast.success(`Fatura ${issued.number} emitida.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["timer"] }),
      ]);
    },
    onError: (error) =>
      toast.error("Não foi possível emitir a fatura", {
        description: error.message,
      }),
  });

  const clients = directory.data.clients.filter(
    (client) => client.archiveBatch === null,
  );
  const paymentMethods = settings.data.paymentMethods;
  const selectedPaymentMethod = paymentMethods.find(
    (method) => String(method.id) === form.paymentMethodId,
  );
  const timezone = timer.data?.preferences.timezone;
  const companyName = settings.data.company?.name;
  const selectedClientInvoices = invoices.data.filter(
    (invoice) => invoice.clientId === Number(form.clientId),
  );
  const latestNumber = selectedClientInvoices.reduce(
    (latest, invoice) => Math.max(latest, invoice.number),
    0,
  );
  const configuredNumber = Number(form.numberStart);
  const validConfiguredNumber =
    Number.isSafeInteger(configuredNumber) && configuredNumber > 0;
  const numberToIssue = latestNumber
    ? latestNumber + 1
    : validConfiguredNumber
      ? configuredNumber
      : "—";

  function update(changes: Partial<Form>) {
    setForm((current) => ({ ...current, ...changes }));
    setMessage("");
    emission.reset();
  }

  function changeRange(changes: Partial<Form>) {
    preview.reset();
    update(changes);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.clientId) {
      setMessage("Escolha um cliente cadastrado.");
      return;
    }
    if (!form.from || !form.to) {
      setMessage("Informe a data inicial e a data final do período.");
      return;
    }
    if (form.from > form.to) {
      setMessage("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setMessage("");
    preview.mutate({
      clientId: Number(form.clientId),
      from: form.from,
      to: form.to,
      currency: form.currency,
      exchangeRate: form.exchangeRate,
      language: form.language,
    });
  }

  function emissionInput(result: NonNullable<typeof preview.data>) {
    return {
      clientId: result.clientId,
      from: result.from,
      to: result.to,
      currency: result.currency,
      exchangeRate: result.exchangeRate ?? "",
      language: result.language,
      paymentMethodId: Number(form.paymentMethodId),
      numberStart: latestNumber ? latestNumber + 1 : Number(form.numberStart),
      expectedTimezone: result.timezone,
      expectedTotalCents: result.totalCents,
      expectedLines: result.lines.map((line) => ({
        ...line,
        serviceDescription:
          descriptions[line.projectId] ?? line.serviceDescription,
      })),
    } satisfies InvoiceIssueInput;
  }

  function confirmEmission() {
    if (!result || !form.paymentMethodId) return;
    emission.mutate(emissionInput(result));
  }

  const result = preview.data;
  const formatDate = hoursDisplayFormatter(result?.timezone);
  const exchangeRateLabel = result?.exchangeRate
    ? `1 USD = ${result.exchangeRate} BRL`
    : null;

  return (
    <section className="page-content invoices-page">
      <h1>Faturas</h1>
      <p className="settings-intro">
        Selecione o cliente e o período para conferir o que entra na próxima
        fatura. A prévia não interrompe o cronômetro, não reserva numeração e
        não bloqueia horas.
      </p>

      <form className="invoice-form" onSubmit={submit}>
        <div className="invoice-form-grid">
          <label className="field" htmlFor="invoice-client">
            Cliente
            <Select
              id="invoice-client"
              value={form.clientId}
              onValueChange={(clientId) =>
                changeRange({ clientId, numberStart: "1" })
              }
              placeholder="Escolha um cliente"
              options={clients.map((client) => ({
                value: String(client.id),
                label: client.name,
              }))}
            />
          </label>
          <label className="field" htmlFor="invoice-currency">
            Moeda da fatura
            <Select
              id="invoice-currency"
              value={form.currency}
              onValueChange={(value) =>
                changeRange({ currency: value as Form["currency"] })
              }
              options={currencyOptions}
            />
          </label>
          <label className="field" htmlFor="invoice-from">
            De
            <Input
              id="invoice-from"
              type="date"
              value={form.from}
              max={form.to || undefined}
              onChange={(event) => changeRange({ from: event.target.value })}
            />
          </label>
          <label className="field" htmlFor="invoice-to">
            Até
            <Input
              id="invoice-to"
              type="date"
              value={form.to}
              min={form.from || undefined}
              onChange={(event) => changeRange({ to: event.target.value })}
            />
          </label>
          <label className="field" htmlFor="invoice-rate">
            Cotação
            <Input
              id="invoice-rate"
              inputMode="decimal"
              placeholder="1 USD = X BRL"
              value={form.exchangeRate}
              onChange={(event) =>
                changeRange({ exchangeRate: event.target.value })
              }
            />
            <span className="field-hint">
              Obrigatória apenas quando houver valores em outra moeda.
            </span>
          </label>
          <label className="field" htmlFor="invoice-language">
            Idioma
            <Select
              id="invoice-language"
              value={form.language}
              onValueChange={(value) =>
                changeRange({ language: value as Form["language"] })
              }
              options={languageOptions}
            />
          </label>
          <label className="field" htmlFor="invoice-payment">
            Dados de pagamento
            <Select
              id="invoice-payment"
              value={form.paymentMethodId}
              disabled={paymentMethods.length === 0}
              placeholder={
                paymentMethods.length
                  ? "Escolha um conjunto"
                  : "Nenhum conjunto cadastrado"
              }
              options={paymentMethods.map((method) => ({
                value: String(method.id),
                label: method.label,
              }))}
              onValueChange={(paymentMethodId) => update({ paymentMethodId })}
            />
          </label>
          <label className="field" htmlFor="invoice-number-start">
            {latestNumber ? "Próximo número" : "Número inicial da sequência"}
            <Input
              id="invoice-number-start"
              type="number"
              min={1}
              step={1}
              required={!latestNumber}
              value={latestNumber ? String(latestNumber + 1) : form.numberStart}
              disabled={latestNumber > 0}
              onChange={(event) => update({ numberStart: event.target.value })}
            />
            <span className="field-hint">
              {latestNumber
                ? "A sequência considera faturas emitidas e canceladas."
                : "Defina o próximo número após sua sequência externa, se houver."}
            </span>
          </label>
        </div>

        {paymentMethods.length === 0 && (
          <p className="field-hint">
            Cadastre um conjunto de dados de pagamento em{" "}
            <Link to="/settings">Configurações</Link> para escolhê-lo aqui.
          </p>
        )}
        {selectedPaymentMethod && (
          <p className="invoice-payment-preview">
            {selectedPaymentMethod.instructions}
          </p>
        )}

        {message && <p role="alert">{message}</p>}
        {preview.isError && (
          <p role="alert" className="invoice-error">
            {preview.error.message}
          </p>
        )}

        <div className="invoice-actions">
          <Button type="submit" disabled={preview.isPending}>
            {preview.isPending ? "Conferindo…" : "Conferir prévia"}
          </Button>
          {timezone && (
            <span className="field-hint">
              Período interpretado no fuso {timezone}.
            </span>
          )}
        </div>
      </form>

      {result && (
        <>
          <section
            className="invoice-preview"
            aria-labelledby="invoice-preview-heading"
          >
            <div className="invoice-preview-heading">
              <div>
                <h2 id="invoice-preview-heading">Prévia</h2>
                <p>
                  {result.clientName} · {result.from} a {result.to}
                  {companyName && ` · emitida por ${companyName}`}
                  {` · Idioma: ${result.language === "en" ? "English" : "Português"}`}
                </p>
              </div>
              <p className="invoice-preview-note">
                Nenhum número reservado e nenhuma hora bloqueada
                {exchangeRateLabel && ` · ${exchangeRateLabel}`}.
              </p>
            </div>

            {result.lines.length === 0 ? (
              <div className="settings-empty">
                <h3>Nenhum registro elegível</h3>
                <p>
                  Confira o período e as exclusões abaixo. Nada será faturado
                  enquanto não houver horas encerradas e inteiras no intervalo.
                </p>
              </div>
            ) : (
              <div className="invoice-lines">
                {result.lines.map((line) => (
                  <article className="invoice-line" key={line.projectId}>
                    <header className="invoice-line-heading">
                      <div>
                        <h3>{line.projectName}</h3>
                        <p>
                          {duration(line.hoursSeconds)} ·{" "}
                          {line.rateCents !== null && line.rateCurrency
                            ? `${formatCents(
                                line.rateCents,
                                line.rateCurrency,
                              )} por hora`
                            : "Valores diferentes por registro"}
                        </p>
                      </div>
                      <strong className="invoice-line-amount">
                        {formatCents(line.subtotalCents, result.currency)}
                      </strong>
                    </header>
                    <p className="field-hint">
                      {line.recordIds.length === 1
                        ? "1 registro incluído"
                        : `${line.recordIds.length} registros incluídos`}
                    </p>
                    <label
                      className="field invoice-line-description"
                      htmlFor={`invoice-description-${line.projectId}`}
                    >
                      Descrição do serviço
                      <Textarea
                        id={`invoice-description-${line.projectId}`}
                        className="settings-textarea"
                        value={
                          descriptions[line.projectId] ??
                          line.serviceDescription
                        }
                        onChange={(event) =>
                          setDescriptions((current) => ({
                            ...current,
                            [line.projectId]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            )}

            <div className="invoice-total">
              <span>
                {result.includedCount === 1
                  ? "1 registro incluído"
                  : `${result.includedCount} registros incluídos`}
              </span>
              <strong>{formatCents(result.totalCents, result.currency)}</strong>
            </div>
            <div className="invoice-actions">
              <Button
                type="button"
                disabled={
                  !form.paymentMethodId ||
                  result.lines.length === 0 ||
                  emission.isPending ||
                  (!latestNumber && !validConfiguredNumber)
                }
                onClick={() => setConfirmIssueOpen(true)}
              >
                Emitir fatura
              </Button>
              {!form.paymentMethodId && (
                <span className="field-hint">
                  Escolha os dados de pagamento para emitir.
                </span>
              )}
            </div>
          </section>

          <section
            className="invoice-exclusions"
            aria-labelledby="invoice-exclusions-heading"
          >
            <h2 id="invoice-exclusions-heading">
              Excluídos da prévia ({result.exclusions.length})
            </h2>
            {result.exclusions.length === 0 ? (
              <p className="field-hint">
                Todos os registros do período foram incluídos.
              </p>
            ) : (
              <ul>
                {result.exclusions.map((exclusion) => (
                  <li key={`${exclusion.recordId}-${exclusion.reason}`}>
                    <div>
                      <strong>{exclusion.message}</strong>
                      <span>
                        {exclusion.description || "Trabalho sem descrição"}
                        {` · ${exclusion.projectName ?? "Sem projeto"}`}
                      </span>
                    </div>
                    <span className="invoice-exclusion-date">
                      {formatDate.format(exclusion.startedAt * 1000)}
                      {exclusion.endedAt !== null &&
                        ` até ${formatDate.format(exclusion.endedAt * 1000)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section
        className="invoice-history"
        aria-labelledby="invoice-history-heading"
      >
        <h2 id="invoice-history-heading">Faturas emitidas</h2>
        {invoices.data.length === 0 ? (
          <p className="field-hint">As faturas emitidas aparecerão aqui.</p>
        ) : (
          <ul className="invoice-history-list">
            {invoices.data.map((invoice) => (
              <li key={invoice.id}>
                <div>
                  <strong>
                    Fatura {invoice.number} ·{" "}
                    {invoice.clientSnapshot?.name ??
                      `Cliente #${invoice.clientId}`}
                  </strong>
                  <span>
                    {invoice.periodFrom && invoice.periodTo && (
                      <>
                        {invoice.periodFrom} a {invoice.periodTo} ·{" "}
                      </>
                    )}
                    {invoice.cancelledAt
                      ? "Cancelada"
                      : invoice.paidAt
                        ? "Paga"
                        : "Emitida"}
                  </span>
                </div>
                <strong>
                  {formatCents(invoice.totalCents, invoice.currency)}
                </strong>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  Ver fatura
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={confirmIssueOpen} onOpenChange={setConfirmIssueOpen}>
        <DialogContent>
          <DialogTitle>Confirmar emissão da fatura?</DialogTitle>
          <DialogDescription>
            A emissão salva uma cópia dos dados e valores e bloqueia os
            registros incluídos. A fatura receberá o número {numberToIssue}.
          </DialogDescription>
          {result && (
            <div className="invoice-confirm-summary">
              <strong>{result.clientName}</strong>
              <span>
                {result.from} a {result.to} · {result.includedCount} registros
              </span>
              <strong>{formatCents(result.totalCents, result.currency)}</strong>
              {companyName && <span>Emitida por {companyName}</span>}
              {selectedPaymentMethod && (
                <span>
                  {selectedPaymentMethod.label}:{" "}
                  {selectedPaymentMethod.instructions}
                </span>
              )}
            </div>
          )}
          {emission.isError && (
            <p role="alert" className="invoice-error">
              {emission.error.message} Confira a prévia novamente antes de
              tentar.
            </p>
          )}
          <div className="invoice-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={emission.isPending}
              onClick={() => setConfirmIssueOpen(false)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={
                emission.isPending ||
                !selectedPaymentMethod ||
                (!latestNumber && !validConfiguredNumber)
              }
              onClick={confirmEmission}
            >
              {emission.isPending ? "Emitindo…" : "Confirmar emissão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        {selectedInvoice && (
          <DialogContent className="invoice-detail-dialog">
            <DialogTitle>Fatura {selectedInvoice.number}</DialogTitle>
            <DialogDescription>
              Emitida em{" "}
              {new Date(selectedInvoice.issuedAt * 1000).toLocaleString(
                "pt-BR",
              )}{" "}
              {selectedInvoice.periodFrom && selectedInvoice.periodTo && (
                <>
                  · {selectedInvoice.periodFrom} a {selectedInvoice.periodTo} (
                  {selectedInvoice.timezone})
                </>
              )}
            </DialogDescription>
            <div className="invoice-detail-parties">
              <section>
                <h3>Cliente</h3>
                <strong>
                  {selectedInvoice.clientSnapshot?.name ??
                    `Cliente #${selectedInvoice.clientId}`}
                </strong>
                {selectedInvoice.clientSnapshot?.legalName && (
                  <span>{selectedInvoice.clientSnapshot.legalName}</span>
                )}
                {selectedInvoice.clientSnapshot?.taxId && (
                  <span>{selectedInvoice.clientSnapshot.taxId}</span>
                )}
                {selectedInvoice.clientSnapshot?.address && (
                  <span>{selectedInvoice.clientSnapshot.address}</span>
                )}
              </section>
              <section>
                <h3>Emitente</h3>
                {selectedInvoice.companySnapshot ? (
                  <>
                    <strong>{selectedInvoice.companySnapshot.name}</strong>
                    {selectedInvoice.companySnapshot.taxId && (
                      <span>{selectedInvoice.companySnapshot.taxId}</span>
                    )}
                    {selectedInvoice.companySnapshot.address && (
                      <span>{selectedInvoice.companySnapshot.address}</span>
                    )}
                    {selectedInvoice.companySnapshot.phone && (
                      <span>{selectedInvoice.companySnapshot.phone}</span>
                    )}
                  </>
                ) : (
                  <span>Dados da empresa não cadastrados na emissão.</span>
                )}
              </section>
            </div>
            {selectedInvoice.paymentSnapshot && (
              <section className="invoice-detail-payment">
                <h3>Pagamento · {selectedInvoice.paymentSnapshot.label}</h3>
                <p>{selectedInvoice.paymentSnapshot.instructions}</p>
              </section>
            )}
            {selectedInvoice.exchangeRate && (
              <p>1 USD = {selectedInvoice.exchangeRate} BRL</p>
            )}
            <ul className="invoice-detail-lines">
              {selectedInvoice.lines.map((line) => (
                <li key={line.projectId}>
                  <div>
                    <strong>{line.serviceDescription}</strong>
                    <span>
                      {line.projectName} · {duration(line.hoursSeconds)}
                    </span>
                  </div>
                  <strong>
                    {formatCents(line.subtotalCents, selectedInvoice.currency)}
                  </strong>
                </li>
              ))}
            </ul>
            <div className="invoice-total">
              <strong>Total</strong>
              <strong>
                {formatCents(
                  selectedInvoice.totalCents,
                  selectedInvoice.currency,
                )}
              </strong>
            </div>
            <div>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`/api/invoices/${selectedInvoice.id}/pdf`} />}
              >
                Baixar PDF
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
