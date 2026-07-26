import axios from "axios";
import {
  CostBasisOverride,
  ImportError,
  ImportResponse,
  SnapshotDetail,
  SnapshotSummary,
  TimelinePoint,
} from "../Models/Holdings";

const BASE = "/api/holdings";

export const importStatement = async (file: File, replace = false): Promise<ImportResponse> => {
  const form = new FormData();
  form.append("file", file);

  try {
    const res = await axios.post<ImportResponse>(`${BASE}/import`, form, {
      params: { replace },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error: any) {
    const data = error?.response?.data;
    if (data?.code) {
      throw new ImportError(data.code, data.message ?? "The statement could not be imported.", data.snapshotId);
    }
    throw new ImportError("unknown", "The statement could not be imported.");
  }
};

export const getSnapshots = async (): Promise<SnapshotSummary[]> => {
  const res = await axios.get<SnapshotSummary[]>(`${BASE}/snapshots`);
  return res.data;
};

export const getLatestSnapshot = async (): Promise<SnapshotDetail | null> => {
  const res = await axios.get<SnapshotDetail | null>(`${BASE}/snapshots/latest`);
  return res.data ?? null;
};

export const getSnapshot = async (id: number): Promise<SnapshotDetail> => {
  const res = await axios.get<SnapshotDetail>(`${BASE}/snapshots/${id}`);
  return res.data;
};

export const deleteSnapshot = async (id: number): Promise<void> => {
  await axios.delete(`${BASE}/snapshots/${id}`);
};

export const getTimeline = async (): Promise<TimelinePoint[]> => {
  const res = await axios.get<TimelinePoint[]>(`${BASE}/timeline`);
  return res.data;
};

export const getCostBasisOverrides = async (): Promise<CostBasisOverride[]> => {
  const res = await axios.get<CostBasisOverride[]>(`${BASE}/cost-basis-overrides`);
  return res.data;
};

export const saveCostBasisOverride = async (rule: {
  isin: string;
  instrumentName?: string | null;
  investedAmount: number;
  reason?: string | null;
  isActive?: boolean;
}): Promise<CostBasisOverride> => {
  const res = await axios.put<{ rule: CostBasisOverride }>(`${BASE}/cost-basis-overrides`, {
    isActive: true,
    ...rule,
  });
  return res.data.rule;
};

export const deleteCostBasisOverride = async (id: number): Promise<void> => {
  await axios.delete(`${BASE}/cost-basis-overrides/${id}`);
};
