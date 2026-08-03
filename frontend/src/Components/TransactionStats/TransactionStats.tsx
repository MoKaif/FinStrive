import React, { useEffect, useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import { rupees, toneFor } from '../../Helpers/Money';
import axios from 'axios';

interface TransactionStatsProps {
    transactions: Transaction[];
}

interface StatProps {
    label: string;
    value: string;
    note: string;
    tone?: string;
}

// A figure and its label, separated from its neighbours by a hairline. The
// cards this replaced were gradient-filled, emoji-headed and scaled on hover,
// which made four equally important numbers read as four different things.
const Stat: React.FC<StatProps> = ({ label, value, note, tone = 'text-term-text' }) => (
    <div className="bg-term-panel px-4 py-4">
        <p className="term-label">{label}</p>
        <p className={`term-num mt-2 text-[22px] leading-none ${tone}`}>{value}</p>
        <p className="mt-2 text-[11px] text-term-dim">{note}</p>
    </div>
);

const TransactionStats: React.FC<TransactionStatsProps> = ({ transactions }) => {
    const [apiBalance, setApiBalance] = useState<number | null>(null);

    useEffect(() => {
        // Fetch the balance from API relative to the current origin
        const fetchBalance = async () => {
            try {
                const response = await axios.get('/api/transactions/balance/hdfc-net');
                setApiBalance(response.data.netBalance);
            } catch (error) {
                console.error('Failed to fetch balance:', error);
                setApiBalance(null);
            }
        };
        fetchBalance();
    }, []);

    const latestClosingBalance = transactions
        .filter(t => t.closingBalance !== undefined && t.closingBalance !== null)
        .sort((a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime())[0]?.closingBalance;

    const isExternalCredit = (t: Transaction) => {
        if (!t.accountTo?.includes('HDFCBank')) return false;
        if (t.accountFrom?.includes('Income')) return true;
        if (t.accountFrom?.includes('Softlink')) return true;
        const desc = t.descriptionRaw?.toLowerCase() ?? '';
        return desc.includes('salary') || desc.includes('interest') || desc.includes('refund') || desc.includes('reimburse');
    };

    const isExternalExpense = (t: Transaction) => {
        if (!t.accountFrom?.includes('HDFCBank')) return false;
        return (
            t.accountTo?.includes('Expenses') ||
            t.accountTo?.includes('Food') ||
            t.accountTo?.includes('Transport') ||
            t.accountTo?.includes('Entertainment') ||
            t.accountTo?.includes('Family') ||
            t.accountTo?.includes('Uncategorized')
        );
    };

    // Use API balance if available, otherwise use fallback calculation
    const currentBalance = apiBalance !== null ? apiBalance : (latestClosingBalance ?? transactions
        .filter(t => isExternalCredit(t) || isExternalExpense(t))
        .reduce((balance, t) => {
            if (isExternalCredit(t)) return balance + Math.abs(t.amount);
            if (isExternalExpense(t)) return balance - Math.abs(t.amount);
            return balance;
        }, 0));

    // Calculate statistics - ONLY count external transactions, not internal transfers
    const totalIncome = transactions
        .filter(isExternalCredit)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenses = transactions
        .filter(isExternalExpense)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalTransactions = transactions.length;

    // Average transaction amount (considering all transactions)
    const averageTransaction = totalTransactions > 0
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / totalTransactions
        : 0;

    // Count income and expense transactions
    const incomeCount = transactions.filter(t => t.accountTo?.includes('HDFCBank')).length;
    const expenseCount = transactions.filter(t => t.accountFrom?.includes('HDFCBank')).length;

    return (
        <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-4">
            <Stat
                label="Current balance"
                value={rupees(currentBalance, 2)}
                note={apiBalance !== null ? 'HDFC Bank net flow' : 'HDFC Bank net flow · computed locally'}
                tone={toneFor(currentBalance)}
            />
            <Stat
                label="Total income"
                value={rupees(totalIncome, 2)}
                note={`${incomeCount} credits`}
                tone="text-term-gain"
            />
            <Stat
                label="Total expenses"
                value={rupees(totalExpenses, 2)}
                note={`${expenseCount} debits`}
                tone="text-term-loss"
            />
            <Stat
                label="Transactions"
                value={totalTransactions.toLocaleString('en-IN')}
                note={`Average ${rupees(averageTransaction, 2)}`}
            />
        </div>
    );
};

export default TransactionStats;
