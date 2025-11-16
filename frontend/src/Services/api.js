/** API client for FinStrive backend. */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Transactions
export const getTransactions = async (params = {}) => {
  const response = await apiClient.get('/transactions', { params });
  return response.data;
};

export const getTransaction = async (id) => {
  const response = await apiClient.get(`/transactions/${id}`);
  return response.data;
};

// Accounts
export const getAccounts = async () => {
  const response = await apiClient.get('/accounts');
  return response.data;
};

export const getAccountBalance = async (accountPath) => {
  const response = await apiClient.get(`/accounts/${encodeURIComponent(accountPath)}/balance`);
  return response.data;
};

// Summary
export const getBankBalance = async () => {
  const response = await apiClient.get('/summary/bank-balance');
  return response.data;
};

// Analytics
export const getMonthlyAnalytics = async (params = {}) => {
  const response = await apiClient.get('/analytics/monthly', { params });
  return response.data;
};

export const getCategoryAnalytics = async (params = {}) => {
  const response = await apiClient.get('/analytics/categories', { params });
  return response.data;
};

// Import
export const importLedger = async (filePath = null) => {
  const params = filePath ? { file_path: filePath } : {};
  const response = await apiClient.post('/import', {}, { params });
  return response.data;
};

// Export
export const exportExcel = async (params = {}) => {
  const response = await apiClient.get('/export/excel', {
    params,
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'finstrive_export.xlsx';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return { success: true };
};

export default apiClient;

