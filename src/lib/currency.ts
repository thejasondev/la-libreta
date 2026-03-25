export type Currency = "CUP" | "USD" | "EUR";

export const CURRENCIES: Record<
  Currency,
  {
    symbol: string;
    label: string;
    flag: string;
    color: string;
    bgColor: string;
  }
> = {
  CUP: {
    symbol: "$",
    label: "CUP",
    flag: "🇨🇺",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  USD: {
    symbol: "$",
    label: "USD",
    flag: "🇺🇸",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  EUR: {
    symbol: "€",
    label: "EUR",
    flag: "🇪🇺",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
};

export const CURRENCY_LIST = Object.keys(CURRENCIES) as Currency[];

/**
 * Format an amount in cents to a human-readable string with currency label.
 * e.g. formatMoney(40000, "CUP") → "$400.00 CUP"
 */
export function formatMoney(cents: number, currency: Currency = "CUP"): string {
  const cfg = CURRENCIES[currency];
  const value = (cents / 100).toFixed(2);
  return `${cfg.symbol}${value} ${cfg.label}`;
}

/**
 * Format just the number portion with symbol (no label).
 * e.g. formatAmount(40000, "CUP") → "$400.00"
 */
export function formatAmount(
  cents: number,
  currency: Currency = "CUP",
): string {
  const cfg = CURRENCIES[currency];
  return `${cfg.symbol}${(cents / 100).toFixed(2)}`;
}

/**
 * Group a list of items with `amount` and `currency` fields by currency,
 * returning the sum per currency.
 */
export function groupByCurrency<
  T extends { amount: number; currency: Currency },
>(items: T[]): Partial<Record<Currency, number>> {
  const result: Partial<Record<Currency, number>> = {};
  for (const item of items) {
    const cur = item.currency || "CUP";
    result[cur] = (result[cur] || 0) + item.amount;
  }
  return result;
}

/**
 * Returns the dominant currency (highest total) from a group.
 */
export function getDominantCurrency(
  grouped: Partial<Record<Currency, number>>,
): Currency {
  let max = 0;
  let dominant: Currency = "CUP";
  for (const [cur, total] of Object.entries(grouped)) {
    if ((total || 0) > max) {
      max = total || 0;
      dominant = cur as Currency;
    }
  }
  return dominant;
}
