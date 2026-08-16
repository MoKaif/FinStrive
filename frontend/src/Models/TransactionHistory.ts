export interface PortfolioTimelinePoint {
  date: string;
  /** Cumulative cost. Exact — reconciles with the statement's invested total. */
  investedCost: number;
  /** Carry-forward reconstruction between transactions, not a valuation. */
  estimatedValue: number;
  contributed: number;
  dividendsReceived: number;
  transactionCount: number;
  valuedPositions: number;
  openPositions: number;
}

export interface PortfolioTimeline {
  points: PortfolioTimelinePoint[];
  firstTxnDate: string | null;
  lastTxnDate: string | null;
  totalInvested: number;
  totalDividends: number;
  valueIsEstimated: boolean;
}

export interface TransactionHistorySummary {
  id: number;
  statementDate: string;
  period: string | null;
  investorName: string | null;
  sourceFileName: string;
  uploadedAt: string;
  transactionCount: number;
  firstTxnDate: string | null;
  lastTxnDate: string | null;
  totalInvested: number;
  totalDividends: number;
  warnings: string[];
}

export interface InvestmentTransactionRow {
  id: number;
  txnDate: string;
  assetClass: string;
  instrumentName: string;
  isin: string | null;
  account: string | null;
  transactionType: string;
  kind: "Investment" | "Dividend" | "Interest" | "Redemption" | "Other";
  amount: number | null;
  quantity: number | null;
  unitPrice: number | null;
  balanceQuantity: number | null;
  marketValue: number | null;
  balanceAmount: number | null;
}

export interface TransactionHistoryDetail extends TransactionHistorySummary {
  transactions: InvestmentTransactionRow[];
}

export interface HistoryImportResult {
  outcome: "Imported" | "Replaced";
  import: TransactionHistorySummary;
  warnings: string[];
}
