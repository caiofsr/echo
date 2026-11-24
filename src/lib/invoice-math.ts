export type InvoiceCurrency = "BRL" | "USD";

/** Exact non-negative fraction used to keep money calculations deterministic. */
export type Fraction = {
  numerator: bigint;
  denominator: bigint;
};

const exchangeRatePattern = /^(\d+)(?:[.,](\d{1,8}))?$/;

/**
 * Reads a positive quote in the form 1 USD = X BRL.
 * The comma is accepted because the interface is in Portuguese.
 */
export function parseExchangeRate(value: string): Fraction | null {
  const match = exchangeRatePattern.exec(value.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  const numerator = BigInt(whole + fraction);
  if (numerator <= 0n) return null;
  return { numerator, denominator: 10n ** BigInt(fraction.length) };
}

export function addFractions(left: Fraction, right: Fraction): Fraction {
  return {
    numerator:
      left.numerator * right.denominator +
      right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  };
}

/**
 * Converts one record using its preserved duration and hourly rate.
 * A quote is only needed when the source and invoice currencies differ.
 */
export function recordAmountFraction(
  seconds: number,
  hourlyRateCents: number,
  sourceCurrency: InvoiceCurrency,
  invoiceCurrency: InvoiceCurrency,
  exchangeRate: Fraction | null,
): Fraction {
  let numerator = BigInt(seconds) * BigInt(hourlyRateCents);
  let denominator = 3600n;
  if (sourceCurrency !== invoiceCurrency) {
    if (!exchangeRate)
      throw new Error(
        "Informe uma cotação positiva para converter valores em outra moeda.",
      );
    if (invoiceCurrency === "BRL") {
      // USD to BRL multiplies by the quote: 1 USD = X BRL.
      numerator *= exchangeRate.numerator;
      denominator *= exchangeRate.denominator;
    } else {
      // BRL to USD divides by the quote.
      numerator *= exchangeRate.denominator;
      denominator *= exchangeRate.numerator;
    }
  }
  return { numerator, denominator };
}

/** Rounds a positive fraction of a cent to the nearest cent, half up. */
export function roundHalfUpCents(value: Fraction) {
  return Number(
    (value.numerator * 2n + value.denominator) / (value.denominator * 2n),
  );
}

/** Formats integer cents in the invoice currency. */
export function formatCents(cents: number, currency: InvoiceCurrency) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
