import axios from "axios";
import { ImportError } from "../Models/Holdings";
import {
  HistoryImportResult,
  PortfolioTimeline,
  TransactionHistoryDetail,
  TransactionHistorySummary,
} from "../Models/TransactionHistory";

const BASE = "/api/holdings/history";

export const importTransactionHistory = async (file: File): Promise<HistoryImportResult> => {
  const form = new FormData();
  form.append("file", file);

  try {
    const res = await axios.post<HistoryImportResult>(`${BASE}/import`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error: any) {
    const data = error?.response?.data;
    if (data?.code) {
      throw new ImportError(data.code, data.message ?? "The history could not be imported.", data.importId);
    }
    throw new ImportError("unknown", "The history could not be imported.");
  }
};

/** Null when nothing has been imported yet; the endpoint answers 204. */
export const getLatestHistory = async (): Promise<TransactionHistorySummary | null> => {
  const res = await axios.get<TransactionHistorySummary | "">(`${BASE}/latest`);
  return res.status === 204 || !res.data ? null : res.data;
};

export const getPortfolioTimeline = async (): Promise<PortfolioTimeline> => {
  const res = await axios.get<PortfolioTimeline>(`${BASE}/timeline`);
  return res.data;
};

export const getInvestmentTransactions = async (
  filters: { isin?: string; assetClass?: string } = {}
): Promise<TransactionHistoryDetail | null> => {
  const res = await axios.get<TransactionHistoryDetail | "">(`${BASE}/transactions`, { params: filters });
  return res.status === 204 || !res.data ? null : res.data;
};

export const deleteTransactionHistory = async (id: number): Promise<void> => {
  await axios.delete(`${BASE}/${id}`);
};
