import React, { useEffect, useMemo, useState } from 'react';
import { Transaction } from '../../Models/Transaction';
import { classifyAll, totalsFor } from '../../Helpers/Ledger';
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

// A figure and its label, separated from its neighbours by a hairline. The cards
// this replaced were gradient-filled, emoji-headed and scaled on hover, which made
// four equally important numbers read as four different things.
const Stat: React.FC<StatProps> = ({ label, value, note, tone = 'text-term-text' }) => (
    <div className="bg-term-panel px-4 py-4">
        <p className="term-label">{label}</p>
        <p className={`term-num mt-2 text-[22px] leading-none ${tone}`}>{value}</p>
        <p className="mt-2 text-[11px] text-term-dim">{note}</p>
    </div>
);

/**
 * All-time totals.
 *
 * These used to be worked out here with their own account-matching rules, which
 * drifted from the ones the charts used: this panel took absolute values while the
 * charts summed signed ones, so the same page reported income two different ways.
 * Both now read from the shared classifier.
 */
const TransactionStats: React.FC<TransactionStatsProps> = ({ transactions }) => {
    const [apiBalance, setApiBalance] = useState<number | null>(null);

    useEffect(() => {
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

    const totals = useMemo(() => totalsFor(classifyAll(transactions)), [transactions]);

    // The statement's own closing balance beats anything we can add up.
    const latestClosingBalance = useMemo(() => {
        const withBalance = transactions.filter(
            (t) => t.closingBalance !== undefined && t.closingBalance !== null
        );
        if (withBalance.length === 0) return null;
        return [...withBalance].sort(
            (a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()
        )[0].closingBalance ?? null;
    }, [transactions]);

    const balance = latestClosingBalance ?? apiBalance ?? 0;
    const balanceNote = latestClosingBalance !== null
        ? 'last closing balance on a statement'
        : apiBalance !== null
            ? 'HDFC Bank net flow'
            : 'no balance available';

    return (
        <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-4">
            <Stat
                label="Balance"
                value={rupees(balance, 2)}
                note={balanceNote}
                tone={toneFor(balance)}
            />
            <Stat
                label="Money in"
                value={rupees(totals.income, 2)}
                note={`${totals.counts.income} credits, all time`}
                tone="text-term-gain"
            />
            <Stat
                label="Spent"
                value={rupees(totals.spending, 2)}
                note={
                    totals.refunds > 0
                        ? `net of ${rupees(totals.refunds, 0)} returned`
                        : `${totals.counts.spending} debits, all time`
                }
                tone="text-term-loss"
            />
            <Stat
                label="Invested"
                value={rupees(totals.investing, 2)}
                note={`${totals.counts.investing} transfers into holdings`}
            />
        </div>
    );
};

export default TransactionStats;
