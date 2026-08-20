import axios from "axios";
import { Transaction } from "../Models/Transaction";

const API_Base = "/api/transactions";
const API_Import = "/api/import";

export type EmailSyncResult = {
    scanned: number;
    matched: number;
    created: number;
    duplicates: number;
    ignored: number;
};

export const importPdf = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(`${API_Import}/pdf`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error importing PDF", error);
        throw error;
    }
}

export const getTransactions = async () => {
    try {
        const response = await axios.get<Transaction[]>(API_Base);
        return response.data;
    } catch (error) {
        console.error("Error fetching transactions", error);
        throw error;
    }
}

export const updateTransaction = async (id: number, transaction: Partial<Transaction>) => {
    try {
        const response = await axios.put<Transaction>(`${API_Base}/${id}`, transaction);
        return response.data;
    } catch (error) {
        console.error("Error updating transaction", error);
        throw error;
    }
}

export const createTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
        const response = await axios.post<Transaction>(API_Base, transaction);
        return response.data;
    } catch (error) {
        console.error("Error creating transaction", error);
        throw error;
    }
}
export const syncEmail = async () => {
    try {
        const response = await axios.post<EmailSyncResult>(`${API_Base}/sync-email-transactions`);
        return response.data;
    } catch (error) {
        console.error("Error syncing email", error);
        throw error;
    }
}
