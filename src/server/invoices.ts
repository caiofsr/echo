import * as v from "valibot";
import { eq, sql } from "drizzle-orm";
import type { Database } from "../db/connection";
import { client, timerPreferences } from "../db/schema";
import {
  invoicePreviewSchema,
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

const exclusionMessages: Record<InvoiceExclusionReason, string> = {
  "in-progress":
    "Contagem em andamento. Encerre o período para incluir estas horas.",
  "no-project":
    "Sem projeto. Vincule o registro a um projeto do cliente antes de faturar.",
  "outside-period":
    "Fora dos limites completos do período. Ajuste as datas para incluir o registro inteiro.",
  "already-invoiced": "Já incluído em uma fatura válida.",
};

export function createInvoiceStore(db: Database) {
  return {
    /** Read-only preview: no number is reserved and no record is locked. */
    async preview(input: InvoicePreviewInput) {
      const values = v.parse(invoicePreviewSchema, input);
      const [preferences] = await db
        .select({ timezone: timerPreferences.timezone })
        .from(timerPreferences)
        .where(eq(timerPreferences.id, 1));
      const timezone = preferences?.timezone ?? "America/Recife";
      const [owner] = await db
        .select({ id: client.id, name: client.name })
        .from(client)
        .where(eq(client.id, values.clientId))
        .limit(1);
      if (!owner) throw new Error("Escolha um cliente cadastrado.");

      const startAt = dayStartSeconds(values.from, timezone);
      const endAt = dayStartSeconds(nextDay(values.to), timezone);
      const rows = await db.all<PreviewRow>(sql`
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
              AND (tr.client_id IS ${values.clientId} OR tr.client_id IS NULL)
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
        for (const record of group.records)
          sourceCurrencies.add(record.currency);
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
        exchangeRate: rateText || null,
        lines,
        totalCents: lines.reduce(
          (total, line) => total + line.subtotalCents,
          0,
        ),
        includedCount: lines.reduce(
          (total, line) => total + line.recordIds.length,
          0,
        ),
        exclusions,
      };
    },
  };
}
