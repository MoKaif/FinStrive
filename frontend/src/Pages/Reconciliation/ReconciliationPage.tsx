import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { amount, statementDate } from "../../Helpers/Money";
import AutocompleteInput from "../../Components/AutocompleteInput/AutocompleteInput";
import { syncEmail } from "../../Services/TransactionService";

type Transaction = {
    id: number;
    txnDate: string;
    descriptionRaw: string;
    descriptionClean: string | null;
    amount: number;
    accountFrom: string | null;
    accountTo: string | null;
    category: string | null;
    source: string;
    mapped: boolean;
};

type TransactionEditForm = {
    descriptionClean?: string;
    category?: string;
    accountFrom?: string;
    accountTo?: string;
    amount?: string;
};

const ReconciliationPage = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<TransactionEditForm>({});
    const [isScanningInbox, setIsScanningInbox] = useState(false);

    // Suggestions State
    const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
    const [accountSuggestions, setAccountSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchUnmappedTransactions(),
                fetchSuggestions()
            ]);
            setIsLoading(false);
        };
        initData();
    }, []);

    const fetchUnmappedTransactions = async () => {
        try {
            const res = await axios.get("/api/transactions?mapped=false");
            setTransactions(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSuggestions = async () => {
        try {
            // Fetch mapped transactions to learn from history
            const res = await axios.get<Transaction[]>("/api/transactions?mapped=true");
            const data = res.data;

            // Extract unique values
            const categories = Array.from(new Set(data.map(t => t.category).filter(Boolean) as string[])).sort();
            const accounts = Array.from(new Set([
                ...data.map(t => t.accountFrom),
                ...data.map(t => t.accountTo)
            ].filter(Boolean) as string[])).sort();

            setCategorySuggestions(categories);
            setAccountSuggestions(accounts);
        } catch (error) {
            console.error("Failed to fetch suggestions", error);
        }
    };

    const handleScanInbox = async () => {
        try {
            setIsScanningInbox(true);
            const result = await syncEmail();
            await fetchUnmappedTransactions();

            if (result.created > 0) {
                toast.success(
                    `${result.created} ${result.created === 1 ? "transaction" : "transactions"} added for reconciliation.`
                );
            } else {
                toast.info(`No new transactions. ${result.duplicates} already imported.`);
            }
        } catch (error) {
            console.error("Failed to scan transaction emails", error);
            toast.error("Could not scan HDFC transaction emails.");
        } finally {
            setIsScanningInbox(false);
        }
    };

    const handleEdit = (txn: Transaction) => {
        setEditingId(txn.id);
        // Helper to clear generic values for direct entry
        const clean = (val: string | null) => (!val || val === "Uncategorized" || val === "Unknown") ? "" : val;

        setEditForm({
            descriptionClean: txn.descriptionClean || txn.descriptionRaw,
            category: clean(txn.category),
            accountFrom: clean(txn.accountFrom),
            accountTo: clean(txn.accountTo),
            amount: txn.amount.toString(),
        } as any);
    };

    const handleSkip = async (txn: Transaction) => {
        try {
            const updatedTxn = {
                ...txn,
                mapped: true, // Mark as mapped
                skipped: true // Mark as intentionally skipped
            };

            await axios.put(`/api/transactions/${txn.id}`, updatedTxn);

            // Remove from list locally for instant feedback
            setTransactions(prev => prev.filter(t => t.id !== txn.id));
        } catch (error) {
            console.error("Failed to skip transaction", error);
            toast.error("Could not skip that transaction.");
        }
    };

    const handleSave = async (id: number) => {
        try {
            const original = transactions.find(t => t.id === id);
            if (!original) return;

            // Ensure AccountTo is populated (fallback to Category if empty)
            // This fixes the issue where changing Category didn't update the Ledger entry which uses AccountTo
            const finalAccountTo = editForm.accountTo || editForm.category || original.accountTo;

            // Parse amount
            const finalAmount = editForm.amount ? parseFloat(editForm.amount) : original.amount;

            // Prepare updated transaction payload
            const updatedTxn = {
                ...original,
                ...editForm,
                amount: finalAmount,
                accountTo: finalAccountTo, // Use the resolved account
                mapped: true // Mark as mapped on save
            };

            await axios.put(`/api/transactions/${id}`, updatedTxn);

            // Remove from list locally for instant feedback
            setTransactions(prev => prev.filter(t => t.id !== id));
            setEditingId(null);

        } catch (error) {
            console.error("Failed to map transaction", error);
            toast.error("Could not save that transaction.");
        }
    };

    return (
        <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
            <div className="mx-auto max-w-[88rem] space-y-5">
                <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-term-rule pb-4">
                    <div>
                        <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight text-term-text">
                            Reconciliation
                        </h1>
                        <p className="mt-2 text-[12px] text-term-muted">
                            {isLoading
                                ? "Loading…"
                                : `${transactions.length} ${transactions.length === 1 ? "entry" : "entries"} still to map`}
                        </p>
                    </div>
                    <button
                        onClick={handleScanInbox}
                        disabled={isScanningInbox}
                        className="term-btn-accent"
                    >
                        {isScanningInbox ? "Scanning inbox…" : "Scan transaction emails"}
                    </button>
                </header>

                {isLoading ? (
                    <p className="term-label py-20 text-center">Loading…</p>
                ) : transactions.length === 0 ? (
                    <section className="term-panel px-8 py-16 text-center">
                        <h2 className="font-display text-[20px] font-semibold text-term-text">Nothing pending</h2>
                        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-term-muted">
                            Every transaction has an account and a category. New ones appear here as
                            they are imported.
                        </p>
                    </section>
                ) : (
                    <div className="space-y-px bg-term-rule">
                        {transactions.map((txn) => (
                            <article key={txn.id} className="bg-term-panel">
                                {/* The raw statement line stays visible while editing — it is the
                                    only evidence of what the entry actually was. */}
                                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-term-rule px-4 py-3">
                                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <span className="term-num text-[11px] text-term-dim">
                                            {statementDate(txn.txnDate)}
                                        </span>
                                        <span className="truncate text-[13px] text-term-text" title={txn.descriptionRaw}>
                                            {txn.descriptionRaw}
                                        </span>
                                        <span className="term-label">{txn.source}</span>
                                    </div>
                                    <span className={`term-num text-[15px] ${txn.amount > 0 ? "text-term-gain" : "text-term-loss"}`}>
                                        ₹{amount(Math.abs(txn.amount), 2)}
                                    </span>
                                </div>

                                {editingId === txn.id ? (
                                    <div className="px-4 py-4">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            <label className="block">
                                                <span className="term-label mb-1.5 block">Description</span>
                                                <input
                                                    className="term-input py-1.5 text-[12px]"
                                                    value={editForm.descriptionClean || ""}
                                                    onChange={e => setEditForm({ ...editForm, descriptionClean: e.target.value })}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="term-label mb-1.5 block">Amount</span>
                                                <input
                                                    className="term-input term-num py-1.5 text-[12px]"
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.amount || ""}
                                                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="term-label mb-1.5 block">Category</span>
                                                <AutocompleteInput
                                                    className="term-input py-1.5 text-[12px]"
                                                    placeholder="Food, Transport…"
                                                    value={editForm.category || ""}
                                                    onChange={val => setEditForm({ ...editForm, category: val })}
                                                    suggestions={categorySuggestions}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="term-label mb-1.5 block">Account from</span>
                                                <AutocompleteInput
                                                    className="term-input py-1.5 font-mono text-[12px]"
                                                    placeholder="Assets:Banking:HDFCBank"
                                                    value={editForm.accountFrom || ""}
                                                    onChange={val => setEditForm({ ...editForm, accountFrom: val })}
                                                    suggestions={accountSuggestions}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="term-label mb-1.5 block">Account to</span>
                                                <AutocompleteInput
                                                    className="term-input py-1.5 font-mono text-[12px]"
                                                    placeholder="Expenses:Food"
                                                    value={editForm.accountTo || ""}
                                                    onChange={val => setEditForm({ ...editForm, accountTo: val })}
                                                    suggestions={accountSuggestions}
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-4 flex items-center justify-end gap-3">
                                            <button onClick={() => setEditingId(null)} className="term-btn">
                                                Cancel
                                            </button>
                                            <button onClick={() => handleSave(txn.id)} className="term-btn-accent">
                                                Save and map
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-4 py-3">
                                        <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                                            {[
                                                ["Description", txn.descriptionClean],
                                                ["Category", txn.category],
                                                ["Account from", txn.accountFrom],
                                                ["Account to", txn.accountTo],
                                            ].map(([label, value]) => (
                                                <div key={label as string}>
                                                    <dt className="term-label">{label}</dt>
                                                    <dd className={`mt-1 truncate text-[12px] ${value ? "text-term-text" : "text-term-dim"}`}>
                                                        {value || "—"}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleSkip(txn)} className="term-btn">
                                                Skip
                                            </button>
                                            <button onClick={() => handleEdit(txn)} className="term-btn-accent">
                                                Map
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReconciliationPage;
