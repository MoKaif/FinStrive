export type AssetClass = "MutualFund" | "StockOrEtf" | "ReitInvit" | "Ppf" | "Other";

export interface Holding {
  id: number;
  assetClass: AssetClass;
  rowOrder: number;
  name: string;
  isin: string | null;
  account: string | null;
  category: string | null;
  groupKey: string;
  units: number | null;
  unitPrice: number | null;
  invested: number;
  investedReported: number;
  marketValue: number;
  totalReturn: number;
  totalReturnReported: number;
  returnPct: number | null;
  xirr: number | null;
  weight: number;
  weightReported: number | null;
  isAggregate: boolean;
  excludedFromTotals: boolean;
  costBasisAdjusted: boolean;
  isEtf: boolean;
  adjustmentNote: string | null;
  isNew: boolean;
  changeMarketValue: number | null;
  changeInvested: number | null;
  changeUnits: number | null;
}

export interface Section {
  assetClass: AssetClass;
  label: string;
  invested: number;
  marketValue: number;
  totalReturn: number;
  returnPct: number | null;
  weight: number;
  changeMarketValue: number | null;
  holdings: Holding[];
}

export interface SnapshotSummary {
  id: number;
  statementDate: string;
  uploadedAt: string;
  sourceFileName: string;
  totalInvested: number;
  totalMarketValue: number;
  totalReturn: number;
  returnPct: number;
  holdingsCount: number;
  warningsCount: number;
}

export interface Adjustment {
  kind: "cost-basis" | "folio-rollup" | "duplicate";
  name: string;
  isin: string | null;
  account: string | null;
  from: number | null;
  to: number | null;
  note: string | null;
}

export interface SnapshotDetail extends SnapshotSummary {
  investorName: string | null;
  reportedInvested: number | null;
  reportedMarketValue: number | null;
  reportedTotalReturn: number | null;
  reportedReturnPct: number | null;
  sections: Section[];
  warnings: string[];
  adjustments: Adjustment[];
  previousSnapshot: SnapshotSummary | null;
  changeMarketValue: number | null;
  changeInvested: number | null;
}

export interface TimelinePoint {
  snapshotId: number;
  statementDate: string;
  invested: number;
  marketValue: number;
  totalReturn: number;
  returnPct: number;
}

export interface CostBasisOverride {
  id: number;
  isin: string;
  instrumentName: string | null;
  investedAmount: number;
  reason: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface ImportResponse {
  outcome: "Imported" | "Replaced";
  warnings: string[];
  snapshot: SnapshotDetail;
}

/** Raised when the API rejects an import; `code` distinguishes recoverable conflicts. */
export class ImportError extends Error {
  code: string;
  snapshotId?: number;

  constructor(code: string, message: string, snapshotId?: number) {
    super(message);
    this.code = code;
    this.snapshotId = snapshotId;
  }

  /** A statement for this date exists already and can be overwritten on retry. */
  get isReplaceable() {
    return this.code === "date-conflict";
  }
}
