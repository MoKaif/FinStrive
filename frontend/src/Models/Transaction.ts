export type Transaction = {
    id: number;
    txnDate: string;
    descriptionRaw: string;
    descriptionClean?: string;
    amount: number;
    accountFrom?: string;
    accountTo?: string;
    category?: string;
    source: string;
    mapped: boolean;
};
