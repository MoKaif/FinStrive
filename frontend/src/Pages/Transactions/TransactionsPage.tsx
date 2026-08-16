import React, { useState, useEffect } from 'react';
import TransactionList from '../../Components/TransactionList/TransactionList';
import TransactionStats from '../../Components/TransactionStats/TransactionStats';
import TransactionCharts from '../../Components/TransactionCharts/TransactionCharts';
import PdfImportModal from '../../Components/PdfImportModal/PdfImportModal';
import ManualTransactionModal from '../../Components/ManualTransactionModal/ManualTransactionModal';
import { getTransactions, syncEmail } from '../../Services/TransactionService';
import { Transaction } from '../../Models/Transaction';
import { toast } from 'react-toastify';

type Props = {};

const TransactionsPage = (props: Props) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, [refreshKey]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImportSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleSyncEmail = async () => {
        try {
            setIsSyncing(true);
            await syncEmail();
            toast.info("Email sync started. New entries appear in a few seconds.");
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error("Could not sync email.");
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-term-ink px-4 pt-24 sm:px-8">
                <p className="term-label py-20 text-center">Loading transactions…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
            <div className="mx-auto max-w-[88rem] space-y-5">
                <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-term-rule pb-4">
                    <div>
                        <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight text-term-text">
                            Transactions
                        </h1>
                        <p className="mt-2 text-[12px] text-term-muted">
                            {transactions.length.toLocaleString('en-IN')} entries in the ledger
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={handleSyncEmail} disabled={isSyncing} className="term-btn">
                            {isSyncing ? 'Syncing…' : 'Sync email'}
                        </button>
                        <button onClick={() => setShowImportModal(true)} className="term-btn">
                            Import PDF
                        </button>
                        <button onClick={() => setShowManualModal(true)} className="term-btn-accent">
                            Add entry
                        </button>
                    </div>
                </header>

                <TransactionStats transactions={transactions} />

                <TransactionCharts transactions={transactions} />

                <TransactionList key={refreshKey} />
            </div>

            <PdfImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={handleImportSuccess}
            />

            <ManualTransactionModal
                isOpen={showManualModal}
                onClose={() => setShowManualModal(false)}
                onSuccess={handleImportSuccess}
            />
        </div>
    );
};

export default TransactionsPage;
