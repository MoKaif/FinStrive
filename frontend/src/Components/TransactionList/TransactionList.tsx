import React, { useEffect, useState, useMemo } from "react";
import { Transaction } from "../../Models/Transaction";
import { getTransactions, updateTransaction } from "../../Services/TransactionService";
import { amount, statementDate } from "../../Helpers/Money";
import ManualTransactionModal from '../ManualTransactionModal/ManualTransactionModal';

/**
 * Editable category, committed when the field is left rather than on every
 * keystroke — typing "Groceries" used to send nine PUTs, and whichever one the
 * server finished last won.
 */
const CategoryCell: React.FC<{ value: string; onCommit: (next: string) => void }> = ({ value, onCommit }) => {
    const [draft, setDraft] = useState(value);

    // Re-sync when the row's own value changes underneath us (refetch, undo).
    useEffect(() => setDraft(value), [value]);

    const commit = () => {
        if (draft !== value) onCommit(draft);
    };

    return (
        <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setDraft(value);
            }}
            placeholder="Uncategorised"
            className="term-focus w-36 border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-term-text placeholder:text-term-dim hover:border-term-rule focus:border-term-rule"
        />
    );
};

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

    const sortMark = (field: keyof Transaction) =>
        sortField === field ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';

    if (loading) return <p className="term-label py-20 text-center">Loading transactions…</p>;
    if (error) return <p className="py-20 text-center text-[13px] text-term-loss">{error}</p>;

    return (
        <section className="term-panel">
            <div className="term-caption">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h2 className="text-[13px] font-semibold text-term-text">Ledger</h2>
                    <span className="term-label">
                        {paginatedTransactions.length} of {filteredAndSortedTransactions.length} shown
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search…"
                        value={filters.search}
                        onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setCurrentPage(1); }}
                        className="term-input w-48 py-1.5 text-[12px]"
                    />
                    <button onClick={() => setShowFilters(!showFilters)} className="term-btn py-1.5">
                        {showFilters ? 'Hide filters' : 'Filters'}
                    </button>
                    <button onClick={exportToCSV} className="term-btn py-1.5">
                        Export CSV
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="border-b border-term-rule bg-term-raised px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                            <span className="term-label mb-1.5 block">Date from</span>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                className="term-input py-1.5 text-[12px]"
                            />
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Date to</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                className="term-input py-1.5 text-[12px]"
                            />
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Category</span>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="term-input py-1.5 text-[12px]"
                            >
                                <option value="">All</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Direction</span>
                            <select
                                value={filters.transactionType}
                                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value as any })}
                                className="term-input py-1.5 text-[12px]"
                            >
                                <option value="all">All</option>
                                <option value="income">Into bank</option>
                                <option value="expense">Out of bank</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Min amount</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.amountMin}
                                onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                                className="term-input py-1.5 text-[12px]"
                            />
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Max amount</span>
                            <input
                                type="number"
                                placeholder="No limit"
                                value={filters.amountMax}
                                onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                                className="term-input py-1.5 text-[12px]"
                            />
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Source</span>
                            <select
                                value={filters.source}
                                onChange={(e) => setFilters({ ...filters, source: e.target.value as any })}
                                className="term-input py-1.5 text-[12px]"
                            >
                                <option value="all">All</option>
                                <option value="pdf">PDF</option>
                                <option value="ledger">Ledger</option>
                            </select>
                        </label>
                        <label className="block">
                            <span className="term-label mb-1.5 block">Status</span>
                            <select
                                value={filters.mapped}
                                onChange={(e) => setFilters({ ...filters, mapped: e.target.value as any })}
                                className="term-input py-1.5 text-[12px]"
                            >
                                <option value="all">All</option>
                                <option value="mapped">Mapped</option>
                                <option value="unmapped">Unmapped</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={resetFilters} className="term-btn py-1.5">
                            Reset
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="border-b border-term-rule bg-term-raised">
                            <th
                                onClick={() => handleSort('txnDate')}
                                className="term-th cursor-pointer hover:text-term-text"
                            >
                                Date{sortMark('txnDate')}
                            </th>
                            <th className="term-th">Description</th>
                            <th
                                onClick={() => handleSort('amount')}
                                className="term-th cursor-pointer text-right hover:text-term-text"
                            >
                                Amount ₹{sortMark('amount')}
                            </th>
                            <th className="term-th">Category</th>
                            <th className="term-th">Source</th>
                            <th className="term-th">Status</th>
                            <th className="term-th text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((txn) => (
                            <tr key={txn.id} className="border-b border-term-rule/60 hover:bg-term-raised">
                                <td className="term-td term-num text-term-muted">
                                    {statementDate(txn.txnDate)}
                                </td>
                                <td className="term-td max-w-md truncate whitespace-normal text-term-text">
                                    {txn.descriptionClean || txn.descriptionRaw}
                                </td>
                                <td className={`term-td term-num text-right ${txn.amount > 0 ? 'text-term-gain' : 'text-term-loss'}`}>
                                    {amount(Math.abs(txn.amount), 2)}
                                </td>
                                <td className="term-td">
                                    <CategoryCell
                                        value={txn.category || ''}
                                        onCommit={(next) => handleCategoryChange(txn.id, next)}
                                    />
                                </td>
                                <td className="term-td term-label">{txn.source}</td>
                                <td className="term-td">
                                    <span className={`term-num text-[11px] ${txn.mapped ? 'text-term-gain' : 'text-term-accent'}`}>
                                        {txn.mapped ? 'mapped' : 'unmapped'}
                                    </span>
                                </td>
                                <td className="term-td text-right">
                                    <div className="flex justify-end gap-2">
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
                                            className="term-focus text-[11px] text-term-muted hover:text-term-accent"
                                        >
                                            Skip
                                        </button>
                                        <span className="text-term-rule">|</span>
                                        <button
                                            onClick={() => {
                                                setEditingTxn(txn);
                                                setShowEditModal(true);
                                            }}
                                            className="term-focus text-[11px] text-term-muted hover:text-term-text"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedTransactions.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-term-muted">
                                    Nothing matches these filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ManualTransactionModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingTxn(null); }}
                onSuccess={() => { setShowEditModal(false); setEditingTxn(null); fetchTransactions(); }}
                existing={editingTxn}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-term-rule px-4 py-3">
                <label className="flex items-center gap-2">
                    <span className="term-label">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="term-select py-1"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </label>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="term-btn py-1.5"
                    >
                        Previous
                    </button>
                    <span className="term-num text-[12px] text-term-muted">
                        {currentPage} / {Math.max(totalPages, 1)}
                    </span>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="term-btn py-1.5"
                    >
                        Next
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TransactionList;
