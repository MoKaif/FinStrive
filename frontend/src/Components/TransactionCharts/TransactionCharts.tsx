import React, { useMemo, useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import { amount, compact, percent, rupees, signedAmount, toneFor } from '../../Helpers/Money';
import {
    balanceSeries,
    byMonth,
    classifyAll,
    incomeBySource,
    spendingByCategory,
    totalsFor,
} from '../../Helpers/Ledger';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface TransactionChartsProps {
    transactions: Transaction[];
}

type TimePeriod = '30d' | '90d' | '1y' | 'all';

// Two-series charts use the app's categorical pair, the same one the portfolio
// uses for cost against value. Green/red is reserved for signed figures in text:
// as a chart pair it sits in the colour-blind floor band, and "money in" against
// "money out" is identity rather than good against bad.
const IN = '#3987e5';
const OUT = '#d95926';
const INVESTED = '#199e70';
const ONE = '#3987e5';

const INK = '#0C1015';
const RULE = '#1C232B';
const MUTED = '#7E8994';
const MONO = 'IBM Plex Mono, monospace';
const axisTick = { fill: MUTED, fontSize: 11, fontFamily: MONO };

const periods: { period: TimePeriod; label: string }[] = [
    { period: '30d', label: '30D' },
    { period: '90d', label: '90D' },
    { period: '1y', label: '1Y' },
    { period: 'all', label: 'All' },
];

const Panel: React.FC<{
    title: string;
    note?: string;
    footnote?: string;
    className?: string;
    children: React.ReactNode;
}> = ({ title, note, footnote, className = '', children }) => (
    <section className={`term-panel flex flex-col ${className}`}>
        <div className="flex items-baseline justify-between gap-4 border-b border-term-rule px-5 py-3">
            <h3 className="term-label text-term-muted">{title}</h3>
            {note && <span className="term-num text-[11px] text-term-dim">{note}</span>}
        </div>
        <div className="flex-1 px-2 py-4">{children}</div>
        {footnote && (
            <p className="border-t border-term-rule px-5 py-2 text-[11px] leading-relaxed text-term-dim">
                {footnote}
            </p>
        )}
    </section>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="px-3 py-12 text-center text-[13px] text-term-muted">{children}</p>
);

const MoneyTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="term-panel px-3 py-2 shadow-lg">
            <div className="term-label mb-1.5 text-term-muted">{label}</div>
            {payload.map((entry: any) => (
                <div key={entry.dataKey ?? entry.name} className="flex items-baseline gap-3">
                    <span
                        aria-hidden
                        className="h-2 w-2 rounded-[1px]"
                        style={{ backgroundColor: entry.color ?? entry.stroke ?? entry.fill }}
                    />
                    <span className="text-[11px] text-term-muted">{entry.name}</span>
                    <span className="term-num ml-auto text-[12px] text-term-text">{amount(entry.value, 2)}</span>
                </div>
            ))}
        </div>
    );
};

const TransactionCharts: React.FC<TransactionChartsProps> = ({ transactions }) => {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y');

    const scoped = useMemo(() => {
        if (timePeriod === 'all') return transactions;

        // Measured from the latest transaction rather than today, so a gap in
        // importing does not silently empty every chart.
        const latest = transactions.reduce(
            (max, t) => Math.max(max, new Date(t.txnDate).getTime()),
            0
        );
        if (!latest) return transactions;

        const cutoff = new Date(latest);
        if (timePeriod === '30d') cutoff.setDate(cutoff.getDate() - 30);
        if (timePeriod === '90d') cutoff.setDate(cutoff.getDate() - 90);
        if (timePeriod === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);

        return transactions.filter((t) => new Date(t.txnDate) >= cutoff);
    }, [transactions, timePeriod]);

    const rows = useMemo(() => classifyAll(scoped), [scoped]);
    const totals = useMemo(() => totalsFor(rows), [rows]);
    const months = useMemo(() => byMonth(rows), [rows]);
    const outgoing = useMemo(() => spendingByCategory(rows), [rows]);
    const incoming = useMemo(() => incomeBySource(rows), [rows]);
    const balance = useMemo(() => balanceSeries(scoped), [scoped]);

    const periodLabel = periods.find((p) => p.period === timePeriod)?.label ?? '';
    const barHeight = (count: number) => Math.max(180, count * 30 + 40);

    return (
        <div className="space-y-5">
            {/* One filter row scoping every chart below it. */}
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-term-rule pb-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h2 className="text-[13px] font-semibold text-term-text">Analytics</h2>
                    <span className="term-label">
                        {rows.length.toLocaleString('en-IN')} entries in scope
                    </span>
                </div>
                <div className="flex border border-term-rule" role="group" aria-label="Time period">
                    {periods.map(({ period, label }) => (
                        <button
                            key={period}
                            onClick={() => setTimePeriod(period)}
                            aria-pressed={timePeriod === period}
                            className={`term-num term-focus border-r border-term-rule px-3 py-1.5 text-[11px] transition-colors last:border-r-0 ${
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

            <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Money in · {periodLabel}</p>
                    <p className="term-num mt-2 text-[20px] leading-none text-term-gain">{rupees(totals.income, 2)}</p>
                    <p className="mt-2 text-[11px] text-term-dim">{totals.counts.income} credits</p>
                </div>
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Spent · {periodLabel}</p>
                    <p className="term-num mt-2 text-[20px] leading-none text-term-loss">{rupees(totals.spending, 2)}</p>
                    <p className="mt-2 text-[11px] text-term-dim">
                        {totals.refunds > 0
                            ? `net of ${rupees(totals.refunds, 0)} returned`
                            : `${totals.counts.spending} debits`}
                    </p>
                </div>
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Invested · {periodLabel}</p>
                    <p className="term-num mt-2 text-[20px] leading-none text-term-text">
                        {rupees(totals.investing, 2)}
                    </p>
                    <p className="mt-2 text-[11px] text-term-dim">
                        {totals.savingsRate === null
                            ? `${totals.counts.investing} transfers`
                            : `${percent(totals.savingsRate, 0)} of money in`}
                    </p>
                </div>
                <div className="bg-term-panel px-4 py-4">
                    <p className="term-label">Kept · {periodLabel}</p>
                    <p className={`term-num mt-2 text-[20px] leading-none ${toneFor(totals.net)}`}>
                        {signedAmount(totals.net, 2)}
                    </p>
                    <p className="mt-2 text-[11px] text-term-dim">money in less spending</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel
                    title="Bank balance"
                    note={balance.length ? `${balance.length} days` : undefined}
                    footnote="Read from the closing balance printed on imported statement rows, not derived from our own arithmetic."
                    className="lg:col-span-2"
                >
                    {balance.length < 2 ? (
                        <Empty>No statement rows in this period carry a closing balance.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={balance} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                                <CartesianGrid stroke={RULE} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={{ stroke: RULE }}
                                    minTickGap={40}
                                    tickFormatter={(d: string) =>
                                        new Date(d).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            timeZone: 'UTC',
                                        })
                                    }
                                />
                                <YAxis
                                    tickFormatter={compact}
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                />
                                <Tooltip content={<MoneyTooltip />} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
                                <Line
                                    type="linear"
                                    dataKey="balance"
                                    name="Closing balance"
                                    stroke={ONE}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, stroke: INK, strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Panel>

                <Panel
                    title="Where the money went"
                    note={outgoing.length ? `${outgoing.length} categories` : undefined}
                    footnote="Spending only. Transfers into investments are counted separately."
                >
                    {outgoing.length === 0 ? (
                        <Empty>No spending in this period.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={barHeight(outgoing.length)}>
                            <BarChart
                                data={outgoing}
                                layout="vertical"
                                margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
                            >
                                <CartesianGrid stroke={RULE} horizontal={false} />
                                <XAxis
                                    type="number"
                                    tickFormatter={compact}
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={{ stroke: RULE }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke={RULE}
                                    tick={{ ...axisTick, fontFamily: 'inherit' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={110}
                                />
                                <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#11161D' }} />
                                {/* One series, so one colour for every bar; length already
                                    encodes magnitude and a ramp would say it twice. */}
                                <Bar dataKey="value" name="Spent" fill={ONE} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Panel>

                <Panel
                    title="Where the money came from"
                    note={incoming.length ? `${incoming.length} sources` : undefined}
                >
                    {incoming.length === 0 ? (
                        <Empty>No income in this period.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={barHeight(incoming.length)}>
                            <BarChart
                                data={incoming}
                                layout="vertical"
                                margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
                            >
                                <CartesianGrid stroke={RULE} horizontal={false} />
                                <XAxis
                                    type="number"
                                    tickFormatter={compact}
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={{ stroke: RULE }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke={RULE}
                                    tick={{ ...axisTick, fontFamily: 'inherit' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={110}
                                />
                                <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#11161D' }} />
                                <Bar dataKey="value" name="Received" fill={ONE} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Panel>

                <Panel
                    title="In, out and invested by month"
                    note={months.length ? `${months.length} months` : undefined}
                    className="lg:col-span-2"
                    footnote="Investing is money moved into your own holdings, so it is neither income nor spending."
                >
                    {months.length === 0 ? (
                        <Empty>No transactions in this period.</Empty>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={months} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
                                <CartesianGrid stroke={RULE} vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={{ stroke: RULE }}
                                    minTickGap={16}
                                />
                                <YAxis
                                    tickFormatter={compact}
                                    stroke={RULE}
                                    tick={axisTick}
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                />
                                <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#11161D' }} />
                                <Legend
                                    verticalAlign="top"
                                    align="left"
                                    height={28}
                                    iconType="square"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 11, color: MUTED, paddingLeft: 8 }}
                                />
                                <Bar dataKey="income" name="In" fill={IN} barSize={10} />
                                <Bar dataKey="spending" name="Spent" fill={OUT} barSize={10} />
                                <Bar dataKey="investing" name="Invested" fill={INVESTED} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Panel>
            </div>
        </div>
    );
};

export default TransactionCharts;
