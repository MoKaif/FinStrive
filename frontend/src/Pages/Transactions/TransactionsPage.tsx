import React, { useState, useEffect } from 'react';
import TransactionList from '../../Components/TransactionList/TransactionList';
import TransactionStats from '../../Components/TransactionStats/TransactionStats';
import TransactionCharts from '../../Components/TransactionCharts/TransactionCharts';
import PdfImportModal from '../../Components/PdfImportModal/PdfImportModal';
import { getTransactions, syncEmail } from '../../Services/TransactionService';
import { Transaction } from '../../Models/Transaction';

type Props = {};

const TransactionsPage = (props: Props) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
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
            alert("Email sync initiated! Please refresh in a few seconds.");
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            alert("Failed to sync email. Check console for details.");
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-dark">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary/20 via-background-dark to-background-dark border-b border-white/10">
                <div className="container mx-auto px-4 py-12 pt-28">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold font-display text-white mb-3">
                                Transactions
                            </h1>
                            <p className="text-slate-400 text-lg">
                                Track, analyze, and manage your financial transactions
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleSyncEmail}
                                disabled={isSyncing}
                                className={`flex items-center gap-2 text-lg px-6 py-3 rounded-lg border border-white/10 text-white transition-all ${isSyncing ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5 active:scale-95"}`}
                            >
                                {isSyncing ? "Syncing..." : "Sync Email"}
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="btn-primary flex items-center gap-2 text-lg px-6 py-3"
                            >
                                Import PDF
                            </button>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <TransactionStats transactions={transactions} />
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Analytics Charts */}
                <div className="mb-12">
                    <TransactionCharts transactions={transactions} />
                </div>

                {/* Transaction List */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">All Transactions</h2>
                    <TransactionList key={refreshKey} />
                </div>
            </div>

            {/* Import Modal */}
            <PdfImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={handleImportSuccess}
            />
        </div>
    );
};

export default TransactionsPage;
