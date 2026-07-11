import React, { useEffect, useState, useMemo } from "react";
import { Transaction } from "../../Models/Transaction";
import { getTransactions, updateTransaction } from "../../Services/TransactionService";
import ManualTransactionModal from '../ManualTransactionModal/ManualTransactionModal';

interface TransactionFilters {
    search: string;
    dateFrom: string;
    dateTo: string;
    category: string;
    amountMin: string;
    amountMax: string;
    transactionType: 'all' | 'income' | 'expense';
    source: 'all' | 'pdf' | 'ledger';
    mapped: 'all' | 'mapped' | 'unmapped';
}

const TransactionList: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof Transaction>('txnDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [showFilters, setShowFilters] = useState(false);
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const [filters, setFilters] = useState<TransactionFilters>({
        search: '',
        dateFrom: '',
        dateTo: '',
        category: '',
        amountMin: '',
        amountMax: '',
        transactionType: 'all',
        source: 'all',
        mapped: 'all',
    });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const data = await getTransactions();
            setTransactions(data);
        } catch (err) {
            setError("Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort transactions
    const filteredAndSortedTransactions = useMemo(() => {
        let filtered = [...transactions];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(t =>
                t.descriptionRaw.toLowerCase().includes(searchLower) ||
                t.descriptionClean?.toLowerCase().includes(searchLower) ||
                t.category?.toLowerCase().includes(searchLower) ||
                t.accountFrom?.toLowerCase().includes(searchLower) ||
                t.accountTo?.toLowerCase().includes(searchLower)
            );
        }

        // Apply date filters
        if (filters.dateFrom) {
            filtered = filtered.filter(t => new Date(t.txnDate) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            filtered = filtered.filter(t => new Date(t.txnDate) <= new Date(filters.dateTo));
        }

        // Apply category filter
        if (filters.category) {
            filtered = filtered.filter(t => t.category === filters.category);
        }

        // Apply amount filters
        if (filters.amountMin) {
            filtered = filtered.filter(t => Math.abs(t.amount) >= parseFloat(filters.amountMin));
        }
        if (filters.amountMax) {
            filtered = filtered.filter(t => Math.abs(t.amount) <= parseFloat(filters.amountMax));
        }

        // Apply transaction type filter
        if (filters.transactionType === 'income') {
            filtered = filtered.filter(t => t.accountTo?.includes('HDFCBank'));
        } else if (filters.transactionType === 'expense') {
            filtered = filtered.filter(t => t.accountFrom?.includes('HDFCBank'));
        }

        // Apply source filter
        if (filters.source !== 'all') {
            filtered = filtered.filter(t => t.source.toLowerCase() === filters.source);
        }

        // Apply mapped filter
        if (filters.mapped === 'mapped') {
            filtered = filtered.filter(t => t.mapped);
        } else if (filters.mapped === 'unmapped') {
            filtered = filtered.filter(t => !t.mapped);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'txnDate') {
                aVal = new Date(a.txnDate).getTime();
                bVal = new Date(b.txnDate).getTime();
            }

            if (aVal === undefined || aVal === null) return 1;
            if (bVal === undefined || bVal === null) return -1;

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [transactions, filters, sortField, sortDirection]);

    // Pagination
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredAndSortedTransactions.slice(startIndex, startIndex + pageSize);
    }, [filteredAndSortedTransactions, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAndSortedTransactions.length / pageSize);

    // Get unique categories for filter dropdown
    const uniqueCategories = useMemo(() => {
        const categories = new Set(transactions.map(t => t.category).filter(Boolean));
        return Array.from(categories).sort();
    }, [transactions]);

    const handleSort = (field: keyof Transaction) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleCategoryChange = async (id: number, newCategory: string) => {
        const original = transactions.find(t => t.id === id);
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));

        try {
            await updateTransaction(id, { id, category: newCategory });
        } catch (err) {
            setError("Failed to update category");
            if (original) {
                setTransactions(prev => prev.map(t => t.id === id ? original : t));
            }
        }
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            dateFrom: '',
            dateTo: '',
            category: '',
            amountMin: '',
            amountMax: '',
            transactionType: 'all',
            source: 'all',
            mapped: 'all',
        });
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Description', 'Amount', 'Category', 'Account From', 'Account To', 'Source', 'Mapped'];
        const rows = filteredAndSortedTransactions.map(t => [
            new Date(t.txnDate).toLocaleDateString(),
            t.descriptionClean || t.descriptionRaw,
            t.amount.toFixed(2),
            t.category || '',
            t.accountFrom || '',
            t.accountTo || '',
            t.source,
            t.mapped ? 'Yes' : 'No',
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="text-white text-center py-20">Loading transactions...</div>;
    if (error) return <div className="text-red-500 text-center py-20">{error}</div>;

    return (
        <div className="space-y-6">
            {/* Header with Search and Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="input-field w-full"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn-primary"
                    >
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="glass-card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Date From</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Date To</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="input-field"
                            >
                                <option value="">All Categories</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Transaction Type</label>
                            <select
                                value={filters.transactionType}
                                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value as any })}
                                className="input-field"
                            >
                                <option value="all">All</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Min Amount</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.amountMin}
                                onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Max Amount</label>
                            <input
                                type="number"
                                placeholder="∞"
                                value={filters.amountMax}
                                onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Source</label>
                            <select
                                value={filters.source}
                                onChange={(e) => setFilters({ ...filters, source: e.target.value as any })}
                                className="input-field"
                            >
                                <option value="all">All Sources</option>
                                <option value="pdf">PDF</option>
                                <option value="ledger">Ledger</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                            <select
                                value={filters.mapped}
                                onChange={(e) => setFilters({ ...filters, mapped: e.target.value as any })}
                                className="input-field"
                            >
                                <option value="all">All</option>
                                <option value="mapped">Mapped</option>
                                <option value="unmapped">Unmapped</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={resetFilters}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Results Summary */}
            <div className="text-slate-400 text-sm">
                Showing {paginatedTransactions.length} of {filteredAndSortedTransactions.length} transactions
            </div>

            {/* Transaction Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th
                                    onClick={() => handleSort('txnDate')}
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                >
                                    Date {sortField === 'txnDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Description
                                </th>
                                <th
                                    onClick={() => handleSort('amount')}
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                >
                                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {paginatedTransactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {new Date(txn.txnDate).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white max-w-xs truncate">
                                        {txn.descriptionClean || txn.descriptionRaw}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ₹{Math.abs(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <input
                                            type="text"
                                            value={txn.category || ''}
                                            onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Uncategorized"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                                            {txn.source}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs ${txn.mapped ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {txn.mapped ? 'Mapped' : 'Unmapped'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    // Mark skipped and remove from UI
                                                    const original = transactions.find(t => t.id === txn.id);
                                                    try {
                                                        await updateTransaction(txn.id, { skipped: true, mapped: true });
                                                        setTransactions(prev => prev.filter(t => t.id !== txn.id));
                                                    } catch (err) {
                                                        setError('Failed to skip transaction');
                                                        if (original) setTransactions(prev => prev.map(t => t.id === original.id ? original : t));
                                                    }
                                                }}
                                                className="text-xs px-3 py-1 rounded bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30"
                                            >
                                                Skip
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingTxn(txn);
                                                    setShowEditModal(true);
                                                }}
                                                className="text-xs px-3 py-1 rounded bg-white/5 text-slate-300 hover:bg-white/10"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            <ManualTransactionModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingTxn(null); }}
                onSuccess={() => { setShowEditModal(false); setEditingTxn(null); fetchTransactions(); }}
                existing={editingTxn}
            />

            {/* Pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-sm">Rows per page:</label>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-white/5 border border-white/10 rounded px-3 py-1 text-white text-sm"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-slate-400 text-sm">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg bg-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
