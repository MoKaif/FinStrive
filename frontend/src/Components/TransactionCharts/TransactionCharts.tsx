import React, { useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import { amount, compact, rupees, toneFor } from '../../Helpers/Money';
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

// Categorical slots, validated as a set against the panel surface for CVD
// separation and contrast. The first four match the portfolio's asset classes.
const COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#8f6fd6', '#c94f8b', '#2f9aa8', '#9a8348'];

const INK = '#0C1015';
const RULE = '#1C232B';
const MUTED = '#7E8994';
const GAIN = '#46C68C';
const LOSS = '#E8635F';
const MONO = 'IBM Plex Mono, monospace';

const axisTick = { fill: MUTED, fontSize: 11, fontFamily: MONO };

// Recharts renders its default tooltip as a white card; this matches the panels.
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="term-panel px-3 py-2 shadow-lg">
            <div className="term-label mb-1.5 text-term-muted">{label}</div>
            {payload.map((entry: any) => (
                <div key={entry.dataKey ?? entry.name} className="flex items-baseline gap-3">
                    <span aria-hidden className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: entry.color ?? entry.stroke ?? entry.fill }} />
                    <span className="text-[11px] text-term-muted">{entry.name}</span>
                    <span className="term-num ml-auto text-[12px] text-term-text">{amount(entry.value, 2)}</span>
                </div>
            ))}
        </div>
    );
};

const Panel: React.FC<{ title: string; note?: string; className?: string; children: React.ReactNode }> = ({
    title,
    note,
    className = '',
    children,
}) => (
    <section className={`term-panel ${className}`}>
        <div className="flex items-baseline justify-between border-b border-term-rule px-5 py-3">
            <h3 className="term-label text-term-muted">{title}</h3>
            {note && <span className="term-num text-[11px] text-term-dim">{note}</span>}
        </div>
        <div className="px-2 py-4">{children}</div>
    </section>
);

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

    const periods: { period: TimePeriod; label: string }[] = [
        { period: '7d', label: '7D' },
        { period: '30d', label: '30D' },
        { period: '90d', label: '90D' },
        { period: '1y', label: '1Y' },
        { period: 'all', label: 'All' },
    ];

    const periodLabel = periods.find(p => p.period === timePeriod)?.label ?? '';

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-term-rule pb-3">
                <h2 className="text-[13px] font-semibold text-term-text">Analytics</h2>
                {/* A single hairline segmented control; the active period is the
                    only thing that gets the accent. */}
                <div className="flex border border-term-rule" role="group" aria-label="Time period">
                    {periods.map(({ period, label }) => (
                        <button
                            key={period}
                            onClick={() => setTimePeriod(period)}
                            aria-pressed={timePeriod === period}
                            className={`term-num term-focus border-r border-term-rule px-3 py-1.5 text-[11px] last:border-r-0 transition-colors ${
                                timePeriod === period
                                    ? 'bg-term-accent/10 text-term-accent'
                                    : 'text-term-muted hover:text-term-text'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-px border border-term-rule bg-term-rule md:grid-cols-3">
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Income · {periodLabel}</p>
                    <p className="term-num mt-2 text-[20px] leading-none text-term-gain">{rupees(periodIncome, 2)}</p>
                </div>
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Expenses · {periodLabel}</p>
                    <p className="term-num mt-2 text-[20px] leading-none text-term-loss">{rupees(periodExpenses, 2)}</p>
                </div>
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Net · {periodLabel}</p>
                    <p className={`term-num mt-2 text-[20px] leading-none ${toneFor(periodNet)}`}>{rupees(periodNet, 2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Daily income and spend" note={`${spendingTrends.length} days`}>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={spendingTrends} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                            <CartesianGrid stroke={RULE} vertical={false} />
                            <XAxis dataKey="date" stroke={RULE} tick={axisTick} tickLine={false} axisLine={{ stroke: RULE }} />
                            <YAxis tickFormatter={compact} stroke={RULE} tick={axisTick} tickLine={false} axisLine={false} width={56} />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
                            <Legend verticalAlign="top" align="left" height={28} iconType="square" iconSize={8}
                                wrapperStyle={{ fontSize: 11, color: MUTED, paddingLeft: 8 }} />
                            <Line type="linear" dataKey="income" stroke={GAIN} strokeWidth={2} name="Income" dot={false} activeDot={{ r: 4, stroke: INK, strokeWidth: 2 }} />
                            <Line type="linear" dataKey="expenses" stroke={LOSS} strokeWidth={2} name="Expenses" dot={false} activeDot={{ r: 4, stroke: INK, strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Panel>

                <Panel title="Where the money went" note={`top ${categoryBreakdown.length}`}>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={categoryBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={88}
                                innerRadius={52}
                                paddingAngle={1}
                                stroke={INK}
                                strokeWidth={1}
                                dataKey="value"
                            >
                                {categoryBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </Panel>

                <Panel title="Income against expenses by month" className="lg:col-span-2" note={`${monthlyComparison.length} months`}>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={monthlyComparison} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                            <CartesianGrid stroke={RULE} vertical={false} />
                            <XAxis dataKey="month" stroke={RULE} tick={axisTick} tickLine={false} axisLine={{ stroke: RULE }} />
                            <YAxis tickFormatter={compact} stroke={RULE} tick={axisTick} tickLine={false} axisLine={false} width={56} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#11161D' }} />
                            <Legend verticalAlign="top" align="left" height={28} iconType="square" iconSize={8}
                                wrapperStyle={{ fontSize: 11, color: MUTED, paddingLeft: 8 }} />
                            <Bar dataKey="income" fill={GAIN} name="Income" />
                            <Bar dataKey="expenses" fill={LOSS} name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </Panel>
            </div>
        </div>
    );
};

export default TransactionCharts;
