import { Transaction } from "../Models/Transaction";

/**
 * One place that decides what a ledger entry means.
 *
 * Two facts about the data drive everything here.
 *
 * First, **the sign of `amount` carries no information**. The same account pair
 * appears with both signs — `HDFCBank → Expenses:Transport` has 145 negative rows
 * and 79 positive ones — because the sign depends on which importer wrote the row.
 * Direction therefore comes from the account pair, and magnitude is always
 * `Math.abs`. Code that adds raw amounts silently subtracts a third of its input.
 *
 * Second, **money leaving the bank is not all spending**. Roughly 55% of it is
 * transfers into your own investments. Lumping those in with expenses overstates
 * spending; dropping them, as the charts used to, hides the larger half of where
 * the money goes. They get their own class.
 */

export type AccountKind =
  | "cash"        // Assets:Banking:*
  | "investment"  // Assets:Investment*
  | "expense"     // Expenses:*
  | "income"      // Income*
  | "other";

export type FlowKind =
  | "income"       // earnings arriving in an account
  | "spending"     // money consumed
  | "investing"    // money moved into an investment
  | "refund"       // money coming back from an expense account
  | "divestment"   // money coming back out of an investment
  | "internal"     // between your own cash accounts; not a gain or a loss
  | "unknown";

export interface ClassifiedTxn {
  txn: Transaction;
  /** Always positive. The reported sign is not trustworthy. */
  magnitude: number;
  from: AccountKind;
  to: AccountKind;
  flow: FlowKind;
  /** Effect on cash on hand: positive in, negative out, zero for internal moves. */
  cashDelta: number;
}

/**
 * Classifies an account path by its top-level segment.
 *
 * `Expense:Uncategorized` (singular) exists in the data alongside `Expenses:*` —
 * a typo made during reconciliation. It is matched here rather than corrected in
 * the database, because the ledger files already reference it.
 */
export const accountKind = (account: string | null | undefined): AccountKind => {
  if (!account) return "other";
  const path = account.trim();

  if (path.startsWith("Assets:Banking")) return "cash";
  if (path.startsWith("Assets:Investment")) return "investment";
  if (path.startsWith("Expenses:") || path.startsWith("Expense:")) return "expense";
  if (path === "Income" || path.startsWith("Income:")) return "income";
  return "other";
};

const flowFor = (from: AccountKind, to: AccountKind): FlowKind => {
  // A transfer between two of your own cash accounts changes nothing.
  if (from === "cash" && to === "cash") return "internal";

  if (to === "investment") return "investing";
  if (from === "investment" && to === "cash") return "divestment";

  if (from === "income") return "income";
  if (from === "expense" && to === "cash") return "refund";

  if (from === "cash" && to === "expense") return "spending";

  // A bank debit to an account that fits nothing else is still money spent.
  if (from === "cash") return "spending";
  if (to === "cash") return "income";

  return "unknown";
};

export const classify = (txn: Transaction): ClassifiedTxn => {
  const from = accountKind(txn.accountFrom);
  const to = accountKind(txn.accountTo);
  const flow = flowFor(from, to);
  const magnitude = Math.abs(txn.amount ?? 0);

  let cashDelta = 0;
  if (flow !== "internal") {
    if (to === "cash") cashDelta = magnitude;
    else if (from === "cash") cashDelta = -magnitude;
  }

  return { txn, magnitude, from, to, flow, cashDelta };
};

export const classifyAll = (transactions: Transaction[]): ClassifiedTxn[] =>
  transactions.map(classify);

// ------------------------------------------------------------------ aggregates

export interface LedgerTotals {
  income: number;
  spending: number;
  investing: number;
  refunds: number;
  divestments: number;
  internal: number;
  unknown: number;
  /** Income less spending: what was actually earned and kept, before investing. */
  net: number;
  /** Share of income put into investments. Null when there was no income. */
  savingsRate: number | null;
  counts: Record<FlowKind, number>;
}

const emptyCounts = (): Record<FlowKind, number> => ({
  income: 0,
  spending: 0,
  investing: 0,
  refund: 0,
  divestment: 0,
  internal: 0,
  unknown: 0,
});

export const totalsFor = (rows: ClassifiedTxn[]): LedgerTotals => {
  const totals: LedgerTotals = {
    income: 0,
    spending: 0,
    investing: 0,
    refunds: 0,
    divestments: 0,
    internal: 0,
    unknown: 0,
    net: 0,
    savingsRate: null,
    counts: emptyCounts(),
  };

  for (const row of rows) {
    totals.counts[row.flow] += 1;
    switch (row.flow) {
      case "income": totals.income += row.magnitude; break;
      case "spending": totals.spending += row.magnitude; break;
      case "investing": totals.investing += row.magnitude; break;
      case "refund": totals.refunds += row.magnitude; break;
      case "divestment": totals.divestments += row.magnitude; break;
      case "internal": totals.internal += row.magnitude; break;
      default: totals.unknown += row.magnitude; break;
    }
  }

  // Refunds are money back on something already counted as spending, so they
  // reduce spending rather than counting as fresh income.
  totals.spending -= totals.refunds;
  totals.net = totals.income - totals.spending;
  totals.savingsRate = totals.income > 0 ? (totals.investing / totals.income) * 100 : null;

  return totals;
};

/** Where the money went, largest first. Uses the expense account, falling back to the category. */
export const spendingByCategory = (rows: ClassifiedTxn[], limit = 8) => {
  const buckets = new Map<string, number>();

  for (const row of rows) {
    if (row.flow !== "spending" && row.flow !== "refund") continue;

    const account = row.txn.accountTo && row.flow === "spending" ? row.txn.accountTo : row.txn.accountFrom;
    const leaf = account?.split(":").pop()?.trim();
    const name = leaf || row.txn.category || "Uncategorised";

    // A refund gives money back to the category it came from.
    const delta = row.flow === "spending" ? row.magnitude : -row.magnitude;
    buckets.set(name, (buckets.get(name) ?? 0) + delta);
  }

  const ranked = [...buckets.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  if (ranked.length <= limit) return ranked;

  // Past the top few the bars are unreadable, so the tail is summed rather than
  // given colours nobody can tell apart.
  const head = ranked.slice(0, limit - 1);
  const tail = ranked.slice(limit - 1).reduce((sum, entry) => sum + entry.value, 0);
  return tail > 0 ? [...head, { name: `Other (${ranked.length - limit + 1})`, value: tail }] : head;
};

/** Where the money came from, largest first. */
export const incomeBySource = (rows: ClassifiedTxn[], limit = 8) => {
  const buckets = new Map<string, number>();

  for (const row of rows) {
    if (row.flow !== "income") continue;
    const leaf = row.txn.accountFrom?.split(":").pop()?.trim();
    const name = leaf === "Income" ? "Unattributed" : leaf || row.txn.category || "Unattributed";
    buckets.set(name, (buckets.get(name) ?? 0) + row.magnitude);
  }

  const ranked = [...buckets.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (ranked.length <= limit) return ranked;
  const head = ranked.slice(0, limit - 1);
  const tail = ranked.slice(limit - 1).reduce((sum, entry) => sum + entry.value, 0);
  return [...head, { name: `Other (${ranked.length - limit + 1})`, value: tail }];
};

/** Month buckets, oldest first, keyed "YYYY-MM" so they sort without date parsing. */
export const byMonth = (rows: ClassifiedTxn[]) => {
  const months = new Map<string, LedgerTotals & { key: string; label: string }>();

  for (const row of rows) {
    const date = new Date(row.txn.txnDate);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    let bucket = months.get(key);
    if (!bucket) {
      bucket = {
        ...totalsFor([]),
        key,
        label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }),
      };
      months.set(key, bucket);
    }

    // Accumulate raw, then re-derive so refunds net off exactly once.
    bucket.counts[row.flow] += 1;
    switch (row.flow) {
      case "income": bucket.income += row.magnitude; break;
      case "spending": bucket.spending += row.magnitude; break;
      case "investing": bucket.investing += row.magnitude; break;
      case "refund": bucket.refunds += row.magnitude; break;
      case "divestment": bucket.divestments += row.magnitude; break;
      case "internal": bucket.internal += row.magnitude; break;
      default: bucket.unknown += row.magnitude; break;
    }
  }

  return [...months.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((bucket) => {
      const spending = bucket.spending - bucket.refunds;
      return {
        ...bucket,
        spending,
        net: bucket.income - spending,
        savingsRate: bucket.income > 0 ? (bucket.investing / bucket.income) * 100 : null,
      };
    });
};

/**
 * The bank balance as the statements report it, one point per day.
 *
 * This is read rather than derived: a running total of our own rows would drift
 * wherever an import missed a transaction, and at least one such gap is known.
 * Only rows carrying a closing balance contribute.
 */
export const balanceSeries = (transactions: Transaction[]) => {
  const byDay = new Map<string, { date: string; balance: number; order: number }>();

  transactions.forEach((txn, index) => {
    if (txn.closingBalance === undefined || txn.closingBalance === null) return;
    const day = new Date(txn.txnDate).toISOString().slice(0, 10);
    const existing = byDay.get(day);
    // Statement rows are listed in running-balance order; the last one for a day wins.
    if (!existing || index > existing.order) {
      byDay.set(day, { date: day, balance: txn.closingBalance, order: index });
    }
  });

  return [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, balance }) => ({ date, balance }));
};
