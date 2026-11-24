import { desc, eq, sql } from "drizzle-orm";
import * as v from "valibot";
import type { Database } from "../db/connection";
import {
  client,
  companySettings,
  invoice,
  invoiceRecord,
  paymentMethod,
  timerPreferences,
} from "../db/schema";
import {
  invoiceIssueSchema,
  invoicePreviewSchema,
  type InvoiceIssueInput,
  type InvoicePreviewInput,
} from "../lib/invoice-input";
import {
  addFractions,
  parseExchangeRate,
  recordAmountFraction,
  roundHalfUpCents,
  type Fraction,
  type InvoiceCurrency,
} from "../lib/invoice-math";
import { dayStartSeconds, nextDay } from "../lib/invoice-period";

export type InvoiceExclusionReason =
  | "in-progress"
  | "no-project"
  | "outside-period"
  | "already-invoiced";

type InvoiceQueryExecutor = Pick<Database, "select" | "all">;

type PreviewRow = {
  id: number;
  startedAt: number;
  endedAt: number | null;
  description: string | null;
  projectId: number | null;
  projectName: string | null;
  hourlyRateCents: number;
  currency: InvoiceCurrency;
  alreadyInvoiced: number;
};

type EligibleRecord = {
  id: number;
  startedAt: number;
  endedAt: number;
  hourlyRateCents: number;
  currency: InvoiceCurrency;
};

type InvoiceLineSnapshot = {
  projectId: number;
  projectName: string;
  serviceDescription: string;
  hoursSeconds: number;
  subtotalCents: number;
  rateCents: number | null;
  rateCurrency: InvoiceCurrency | null;
  recordIds: number[];
};

type ClientSnapshot = {
  name: string;
  legalName: string | null;
  taxId: string | null;
  address: string | null;
};

type CompanySnapshot = {
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
} | null;

type PaymentSnapshot = { label: string; instructions: string };

const exclusionMessages: Record<InvoiceExclusionReason, string> = {
  "in-progress":
    "Contagem em andamento. Encerre o período para incluir estas horas.",
  "no-project":
    "Sem projeto. Vincule o registro a um projeto do cliente antes de faturar.",
  "outside-period":
    "Fora dos limites completos do período. Ajuste as datas para incluir o registro inteiro.",
  "already-invoiced": "Já incluído em uma fatura válida.",
};

async function buildPreview(
  executor: InvoiceQueryExecutor,
  input: InvoicePreviewInput,
) {
  const values = v.parse(invoicePreviewSchema, input);
  const [preferences] = await executor
    .select({ timezone: timerPreferences.timezone })
    .from(timerPreferences)
    .where(eq(timerPreferences.id, 1));
  const timezone = preferences?.timezone ?? "America/Recife";
  const [owner] = await executor
    .select({ id: client.id, name: client.name })
    .from(client)
    .where(eq(client.id, values.clientId))
    .limit(1);
  if (!owner) throw new Error("Escolha um cliente cadastrado.");

  const startAt = dayStartSeconds(values.from, timezone);
  const endAt = dayStartSeconds(nextDay(values.to), timezone);
  const rows = await executor.all<PreviewRow>(sql`
    SELECT tr.id, tr.started_at AS startedAt, tr.ended_at AS endedAt,
      tr.description, tr.project_id AS projectId, p.name AS projectName,
      tr.hourly_rate_cents AS hourlyRateCents, tr.currency,
      EXISTS (
        SELECT 1 FROM invoice_record ir
        JOIN invoice i ON i.id = ir.invoice_id
        WHERE ir.record_id = tr.id AND i.cancelled_at IS NULL
      ) AS alreadyInvoiced
    FROM time_record tr
    LEFT JOIN project p ON p.id = tr.project_id
    WHERE tr.started_at < ${endAt}
      AND (tr.ended_at IS NULL OR tr.ended_at >= ${startAt})
      AND (
        (tr.project_id IS NOT NULL AND p.client_id = ${values.clientId})
        OR (
          tr.project_id IS NULL
          AND tr.client_id IS ${values.clientId}
        )
      )
    ORDER BY tr.started_at DESC, tr.id DESC`);

  const exclusions = [];
  const groups = new Map<
    number,
    { projectId: number; projectName: string; records: EligibleRecord[] }
  >();
  for (const row of rows) {
    let reason: InvoiceExclusionReason | null = null;
    if (row.endedAt === null) reason = "in-progress";
    else if (row.projectId === null) reason = "no-project";
    else if (row.startedAt < startAt || row.endedAt > endAt)
      reason = "outside-period";
    else if (row.alreadyInvoiced) reason = "already-invoiced";
    if (reason) {
      exclusions.push({
        recordId: row.id,
        description: row.description,
        projectName: row.projectName,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        reason,
        message: exclusionMessages[reason],
      });
      continue;
    }
    if (row.endedAt === null || row.projectId === null) continue;
    const group = groups.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName ?? "Projeto",
      records: [],
    };
    group.records.push({
      id: row.id,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      hourlyRateCents: row.hourlyRateCents,
      currency: row.currency,
    });
    groups.set(row.projectId, group);
  }

  const sourceCurrencies = new Set<InvoiceCurrency>();
  for (const group of groups.values())
    for (const record of group.records) sourceCurrencies.add(record.currency);
  const needsExchangeRate = [...sourceCurrencies].some(
    (currency) => currency !== values.currency,
  );
  const rateText = values.exchangeRate ?? "";
  const exchangeRate = parseExchangeRate(rateText);
  if (needsExchangeRate && !exchangeRate)
    throw new Error(
      rateText
        ? "Informe uma cotação positiva no formato 1 USD = X BRL."
        : "Informe uma cotação positiva (1 USD = X BRL) para converter valores em outra moeda.",
    );

  const lines = [...groups.values()]
    .map((group) => {
      const hoursSeconds = group.records.reduce(
        (total, record) => total + (record.endedAt - record.startedAt),
        0,
      );
      let amount: Fraction = { numerator: 0n, denominator: 1n };
      for (const record of group.records) {
        amount = addFractions(
          amount,
          recordAmountFraction(
            record.endedAt - record.startedAt,
            record.hourlyRateCents,
            record.currency,
            values.currency,
            exchangeRate,
          ),
        );
      }
      const first = group.records[0];
      const uniformRate = group.records.every(
        (record) =>
          record.hourlyRateCents === first.hourlyRateCents &&
          record.currency === first.currency,
      );
      return {
        projectId: group.projectId,
        projectName: group.projectName,
        serviceDescription: group.projectName,
        hoursSeconds,
        subtotalCents: roundHalfUpCents(amount),
        rateCents: uniformRate ? first.hourlyRateCents : null,
        rateCurrency: uniformRate ? first.currency : null,
        recordIds: group.records
          .map((record) => record.id)
          .sort((left, right) => left - right),
      };
    })
    .sort(
      (left, right) =>
        left.projectName.localeCompare(right.projectName, "pt-BR") ||
        left.projectId - right.projectId,
    );

  return {
    clientId: owner.id,
    clientName: owner.name,
    from: values.from,
    to: values.to,
    timezone,
    currency: values.currency,
    language: values.language,
    exchangeRate: needsExchangeRate ? rateText || null : null,
    lines,
    totalCents: lines.reduce((total, line) => total + line.subtotalCents, 0),
    includedCount: lines.reduce(
      (total, line) => total + line.recordIds.length,
      0,
    ),
    exclusions,
  };
}

function sameIds(left: number[], right: number[]) {
  const sort = (items: number[]) => [...items].sort((a, b) => a - b);
  return JSON.stringify(sort(left)) === JSON.stringify(sort(right));
}

function matchPreview(
  current: Awaited<ReturnType<typeof buildPreview>>,
  input: InvoiceIssueInput,
) {
  if (
    current.timezone !== input.expectedTimezone ||
    current.totalCents !== input.expectedTotalCents ||
    current.lines.length !== input.expectedLines.length
  )
    throw new Error(
      "A prévia mudou. Confira novamente as horas antes de emitir a fatura.",
    );

  const byProject = new Map(
    input.expectedLines.map((line) => [line.projectId, line]),
  );
  if (byProject.size !== input.expectedLines.length)
    throw new Error(
      "A prévia mudou. Confira novamente as horas antes de emitir a fatura.",
    );

  const recordIds: number[] = [];
  const lines: InvoiceLineSnapshot[] = current.lines.map((line) => {
    const expected = byProject.get(line.projectId);
    if (
      !expected ||
      expected.projectName !== line.projectName ||
      expected.hoursSeconds !== line.hoursSeconds ||
      expected.subtotalCents !== line.subtotalCents ||
      expected.rateCents !== line.rateCents ||
      expected.rateCurrency !== line.rateCurrency ||
      !sameIds(expected.recordIds, line.recordIds)
    )
      throw new Error(
        "A prévia mudou. Confira novamente as horas antes de emitir a fatura.",
      );
    recordIds.push(...line.recordIds);
    return { ...line, serviceDescription: expected.serviceDescription };
  });
  if (new Set(recordIds).size !== recordIds.length)
    throw new Error(
      "A prévia mudou. Confira novamente as horas antes de emitir a fatura.",
    );
  return { lines, recordIds };
}

function decodeInvoice(row: typeof invoice.$inferSelect) {
  const {
    clientSnapshot,
    companySnapshot,
    paymentSnapshot,
    linesSnapshot,
    ...fields
  } = row;
  return {
    ...fields,
    clientSnapshot: JSON.parse(clientSnapshot) as ClientSnapshot,
    companySnapshot: JSON.parse(companySnapshot) as CompanySnapshot,
    paymentSnapshot: JSON.parse(paymentSnapshot) as PaymentSnapshot,
    lines: JSON.parse(linesSnapshot) as InvoiceLineSnapshot[],
  };
}

export function createInvoiceStore(db: Database, clock = Date.now) {
  return {
    /** Read-only preview: no number is reserved and no record is locked. */
    preview(input: InvoicePreviewInput) {
      return buildPreview(db, input);
    },

    /** Revalidates the preview and commits the snapshot and record links together. */
    async issue(input: InvoiceIssueInput) {
      const values = v.parse(invoiceIssueSchema, input);
      const previewInput: InvoicePreviewInput = {
        clientId: values.clientId,
        from: values.from,
        to: values.to,
        currency: values.currency,
        exchangeRate: values.exchangeRate,
        language: values.language,
      };

      const row = await db.transaction(async (tx) => {
        const current = await buildPreview(tx, previewInput);
        const { lines, recordIds } = matchPreview(current, values);
        const [[clientRow], [companyRow], [paymentRow], [latest]] =
          await Promise.all([
            tx
              .select({
                name: client.name,
                legalName: client.legalName,
                taxId: client.taxId,
                address: client.address,
              })
              .from(client)
              .where(eq(client.id, values.clientId))
              .limit(1),
            tx
              .select({
                name: companySettings.name,
                taxId: companySettings.taxId,
                address: companySettings.address,
                phone: companySettings.phone,
              })
              .from(companySettings)
              .where(eq(companySettings.id, "owner"))
              .limit(1),
            tx
              .select({
                label: paymentMethod.label,
                instructions: paymentMethod.instructions,
              })
              .from(paymentMethod)
              .where(eq(paymentMethod.id, values.paymentMethodId))
              .limit(1),
            tx
              .select({ number: invoice.number })
              .from(invoice)
              .where(eq(invoice.clientId, values.clientId))
              .orderBy(desc(invoice.number))
              .limit(1),
          ]);
        if (!clientRow) throw new Error("Escolha um cliente cadastrado.");
        if (!paymentRow)
          throw new Error(
            "Escolha um conjunto de dados de pagamento cadastrado.",
          );

        const number = latest ? latest.number + 1 : values.numberStart;
        const clientSnapshot: ClientSnapshot = {
          name: clientRow.name,
          legalName: clientRow.legalName,
          taxId: clientRow.taxId,
          address: clientRow.address,
        };
        const companySnapshot: CompanySnapshot = companyRow
          ? {
              name: companyRow.name,
              taxId: companyRow.taxId,
              address: companyRow.address,
              phone: companyRow.phone,
            }
          : null;
        const paymentSnapshot: PaymentSnapshot = {
          label: paymentRow.label,
          instructions: paymentRow.instructions,
        };
        const [created] = await tx
          .insert(invoice)
          .values({
            clientId: values.clientId,
            number,
            language: values.language,
            currency: values.currency,
            exchangeRate: current.exchangeRate,
            totalCents: current.totalCents,
            periodFrom: current.from,
            periodTo: current.to,
            timezone: current.timezone,
            clientSnapshot: JSON.stringify(clientSnapshot),
            companySnapshot: JSON.stringify(companySnapshot),
            paymentSnapshot: JSON.stringify(paymentSnapshot),
            linesSnapshot: JSON.stringify(lines),
            issuedAt: Math.floor(clock() / 1000),
          })
          .returning();
        await tx
          .insert(invoiceRecord)
          .values(
            recordIds.map((recordId) => ({ invoiceId: created.id, recordId })),
          );
        return created;
      });
      return decodeInvoice(row);
    },

    async list() {
      const rows = await db
        .select()
        .from(invoice)
        .orderBy(desc(invoice.issuedAt), desc(invoice.id));
      return rows.map(decodeInvoice);
    },
  };
}
