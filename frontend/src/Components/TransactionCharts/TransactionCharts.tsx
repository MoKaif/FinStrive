import React, { useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface TransactionChartsProps {
    transactions: Transaction[];
}

type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const TransactionCharts: React.FC<TransactionChartsProps> = ({ transactions }) => {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');

    // Filter transactions by time period
    const getFilteredTransactions = () => {
        const now = new Date();
        const cutoffDate = new Date();

        switch (timePeriod) {
            case '7d':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                cutoffDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                cutoffDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
                return transactions;
        }

        return transactions.filter(t => new Date(t.txnDate) >= cutoffDate);
    };

    const filteredTransactions = getFilteredTransactions();

    // Aggregate totals for the currently selected time period
    const periodIncome = filteredTransactions.reduce((s, t) => {
        if (t.accountTo?.includes('HDFCBank') && (t.accountFrom?.includes('Income') || t.descriptionRaw?.toLowerCase().includes('salary') || t.descriptionRaw?.toLowerCase().includes('interest') || t.descriptionRaw?.toLowerCase().includes('refund'))) {
            return s + t.amount;
        }
        return s;
    }, 0);

    const periodExpenses = filteredTransactions.reduce((s, t) => {
        if (t.accountFrom?.includes('HDFCBank') && (t.accountTo?.includes('Expenses') || t.accountTo?.includes('Food') || t.accountTo?.includes('Transport'))) {
            return s + Math.abs(t.amount);
        }
        return s;
    }, 0);

    const periodNet = periodIncome - periodExpenses;

    // Prepare spending trends data (daily aggregation)
    const getSpendingTrends = () => {
        const dailyData: { [key: string]: { income: number; expenses: number; date: string; sortDate: number } } = {};

        filteredTransactions.forEach(t => {
            const dateObj = new Date(t.txnDate);
            const dateKey = dateObj.toISOString().split('T')[0];

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                    income: 0,
                    expenses: 0,
                    sortDate: dateObj.getTime()
                };
            }

            // Only count legitimate income (external deposits)
            if (t.accountTo?.includes('HDFCBank') &&
                (t.accountFrom?.includes('Income') ||
                 t.accountFrom?.includes('Softlink') ||
                 t.descriptionRaw?.toLowerCase().includes('salary') ||
                 t.descriptionRaw?.toLowerCase().includes('interest') ||
                 t.descriptionRaw?.toLowerCase().includes('refund'))) {
                dailyData[dateKey].income += t.amount;
            }

            // Only count legitimate expenses (external withdrawals)
            if (t.accountFrom?.includes('HDFCBank') &&
                (t.accountTo?.includes('Expenses') ||
                 t.accountTo?.includes('Food') ||
                 t.accountTo?.includes('Transport') ||
                 t.accountTo?.includes('Entertainment') ||
                 t.accountTo?.includes('Family') ||
                 t.accountTo?.includes('Uncategorized'))) {
                dailyData[dateKey].expenses += Math.abs(t.amount);
            }
        });

        return Object.values(dailyData).sort((a, b) => a.sortDate - b.sortDate);
    };

    // Prepare category breakdown data
    const getCategoryBreakdown = () => {
        const categoryData: { [key: string]: number } = {};

        filteredTransactions
            .filter(t => t.accountFrom?.includes('HDFCBank') &&
                        (t.accountTo?.includes('Expenses') ||
                         t.accountTo?.includes('Food') ||
                         t.accountTo?.includes('Transport') ||
                         t.accountTo?.includes('Entertainment') ||
                         t.accountTo?.includes('Family') ||
                         t.accountTo?.includes('Uncategorized'))) // Only legitimate expenses
            .forEach(t => {
                const category = t.category || 'Uncategorized';
                categoryData[category] = (categoryData[category] || 0) + Math.abs(t.amount);
            });

        return Object.entries(categoryData)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 categories
    };

    // Prepare monthly income vs expenses
    const getMonthlyComparison = () => {
        const monthlyData: { [key: string]: { month: string; income: number; expenses: number } } = {};

        filteredTransactions.forEach(t => {
            const date = new Date(t.txnDate);
            const month = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;

            if (!monthlyData[month]) {
                monthlyData[month] = { month, income: 0, expenses: 0 };
            }

            // Only count legitimate income (external deposits)
            if (t.accountTo?.includes('HDFCBank') &&
                (t.accountFrom?.includes('Income') ||
                 t.accountFrom?.includes('Softlink') ||
                 t.descriptionRaw?.toLowerCase().includes('salary') ||
                 t.descriptionRaw?.toLowerCase().includes('interest') ||
                 t.descriptionRaw?.toLowerCase().includes('refund'))) {
                monthlyData[month].income += t.amount;
            }

            // Only count legitimate expenses (external withdrawals)
            if (t.accountFrom?.includes('HDFCBank') &&
                (t.accountTo?.includes('Expenses') ||
                 t.accountTo?.includes('Food') ||
                 t.accountTo?.includes('Transport') ||
                 t.accountTo?.includes('Entertainment') ||
                 t.accountTo?.includes('Family') ||
                 t.accountTo?.includes('Uncategorized'))) {
                monthlyData[month].expenses += Math.abs(t.amount);
            }
        });

        return Object.values(monthlyData).sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
        });
    };

    const spendingTrends = getSpendingTrends();
    const categoryBreakdown = getCategoryBreakdown();
    const monthlyComparison = getMonthlyComparison();

    const TimePeriodButton: React.FC<{ period: TimePeriod; label: string }> = ({ period, label }) => (
        <button
            onClick={() => setTimePeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timePeriod === period
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Period summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4">
                    <div className="text-sm text-slate-400">Income ({timePeriod})</div>
                    <div className="text-xl font-bold text-green-400">₹{periodIncome.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-sm text-slate-400">Expenses ({timePeriod})</div>
                    <div className="text-xl font-bold text-red-400">₹{periodExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-sm text-slate-400">Net ({timePeriod})</div>
                    <div className={`text-xl font-bold ${periodNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{periodNet.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
                </div>
            </div>
            {/* Time Period Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Analytics</h2>
                <div className="flex gap-2">
                    <TimePeriodButton period="7d" label="7 Days" />
                    <TimePeriodButton period="30d" label="30 Days" />
                    <TimePeriodButton period="90d" label="90 Days" />
                    <TimePeriodButton period="1y" label="1 Year" />
                    <TimePeriodButton period="all" label="All Time" />
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending Trends */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Spending Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={spendingTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Breakdown */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Expense Categories</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                                formatter={(value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Income vs Expenses */}
                <div className="glass-card p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Monthly Income vs Expenses</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyComparison}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                                formatter={(value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            />
                            <Legend />
                            <Bar dataKey="income" fill="#10b981" name="Income" />
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TransactionCharts;
