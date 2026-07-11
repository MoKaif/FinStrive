import React, { useEffect, useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import axios from 'axios';

interface TransactionStatsProps {
    transactions: Transaction[];
}

interface StatCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: string;
    color: 'green' | 'red' | 'blue' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
    const colorClasses = {
        green: 'from-green-500/20 to-green-600/20 border-green-500/30',
        red: 'from-red-500/20 to-red-600/20 border-red-500/30',
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
        purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    };

    const iconColorClasses = {
        green: 'text-green-400',
        red: 'text-red-400',
        blue: 'text-blue-400',
        purple: 'text-purple-400',
    };

    return (
        <div className={`glass-card p-6 bg-gradient-to-br ${colorClasses[color]} hover:scale-105 transition-transform duration-300`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
                    <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                    <p className="text-slate-500 text-xs">{subtitle}</p>
                </div>
                <div className={`text-4xl ${iconColorClasses[color]} opacity-80`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

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

    const hasClosingBalance = transactions.some(t => t.closingBalance !== undefined && t.closingBalance !== null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Current Balance"
                value={`₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="HDFC Bank net flow"
                icon="🏦"
                color="blue"
            />
            <StatCard
                title="Total Income"
                value={`₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`${incomeCount} transactions`}
                icon="💰"
                color="green"
            />
            <StatCard
                title="Total Expenses"
                value={`₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`${expenseCount} transactions`}
                icon="💸"
                color="red"
            />
            <StatCard
                title="Total Transactions"
                value={totalTransactions.toString()}
                subtitle={`Avg: ₹${averageTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon="📊"
                color="purple"
            />
        </div>
    );
};

export default TransactionStats;
