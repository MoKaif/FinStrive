import axios from 'axios';
import { PortfolioGet, PortfolioPost } from "../Models/Portfolio";
import { handleError } from "../Helpers/ErrorHandler";

const BASE = '/api/portfolio';
const api = '/api/portfolio/';

// Statement upload and holdings retrieval live in HoldingsService.tsx.
// What remains here is the ValueResearch session proxy and stock-portfolio CRUD.

export const setSession = async (phpSession: string) => {
    const res = await axios.post(`${BASE}/session`, { phpSession });
    return res.data;
}

export const getSession = async () => {
    const res = await axios.get(`${BASE}/session`);
    return res.data;
}

export const getPeriodReturns = async (labelIds: string, period = '1D', asOf = '') => {
    const res = await axios.get(`${BASE}/period-returns`, { params: { labelIds, period, asOfDate: asOf } });
    return res.data;
}

export const getPerformance = async (labelIds: string, period = 'ALL', asOf = '') => {
    const res = await axios.get(`${BASE}/performance`, { params: { labelIds, period, asOfDate: asOf } });
    return res.data;
}

// Existing portfolio APIs used elsewhere in the app (search/portfolio management)
export const portfolioAddAPI = async (symbol: string) => {
  try {
    const data = await axios.post<PortfolioPost>(api + `?symbol=${symbol}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const portfolioDeleteAPI = async (symbol: string) => {
  try {
    const data = await axios.delete<PortfolioPost>(api + `?symbol=${symbol}`);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export const portfolioGetAPI = async () => {
  try {
    const data = await axios.get<PortfolioGet[]>(api);
    return data;
  } catch (error) {
    handleError(error);
  }
};

export default {};
