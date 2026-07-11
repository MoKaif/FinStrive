import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../Context/useAuth";
import AutocompleteInput from "../../Components/AutocompleteInput/AutocompleteInput";

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
    const { token } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<TransactionEditForm>({});

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
            alert("Failed to skip transaction.");
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
            alert("Failed to save transaction.");
        }
    };

    return (
        <div className="min-h-screen bg-background-dark p-8 pt-28">
            <div className="container mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-display text-white mb-2">Reconciliation</h1>
                        <p className="text-slate-400">Review and map {transactions.length} pending transactions.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-white text-center py-20">Loading...</div>
                ) : (
                    <div className="grid gap-6">
                        {transactions.map((txn) => (
                            <div key={txn.id} className="glass-card p-6 flex flex-col md:flex-row gap-6 items-start md:items-center animate-fade-in hover:border-primary/30 transition-colors">

                                {/* Static Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="text-sm text-slate-500 font-mono mb-1">{new Date(txn.txnDate).toLocaleDateString()}</div>
                                    <div className="font-medium text-white mb-1 line-clamp-1" title={txn.descriptionRaw}>{txn.descriptionRaw}</div>
                                    <div className={`text-lg font-bold ${txn.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                                        ₹{Math.abs(txn.amount).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-slate-600 uppercase mt-2">{txn.source}</div>
                                </div>

                                {/* Edit Form Area */}
                                {editingId === txn.id ? (
                                    <div className="flex-2 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                        <input
                                            className="input-field py-2 text-sm"
                                            placeholder="Clean Description"
                                            value={editForm.descriptionClean || ""}
                                            onChange={e => setEditForm({ ...editForm, descriptionClean: e.target.value })}
                                        />
                                        <input
                                            className="input-field py-2 text-sm"
                                            type="number"
                                            step="0.01"
                                            placeholder="Amount"
                                            value={editForm.amount || ""}
                                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                        />
                                        <AutocompleteInput
                                            className="input-field py-2 text-sm"
                                            placeholder="Category"
                                            value={editForm.category || ""}
                                            onChange={val => setEditForm({ ...editForm, category: val })}
                                            suggestions={categorySuggestions}
                                        />
                                        <AutocompleteInput
                                            className="input-field py-2 text-sm"
                                            placeholder="Account From"
                                            value={editForm.accountFrom || ""}
                                            onChange={val => setEditForm({ ...editForm, accountFrom: val })}
                                            suggestions={accountSuggestions}
                                        />
                                        <AutocompleteInput
                                            className="input-field py-2 text-sm"
                                            placeholder="Account To"
                                            value={editForm.accountTo || ""}
                                            onChange={val => setEditForm({ ...editForm, accountTo: val })}
                                            suggestions={accountSuggestions}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 text-xs">Description</span>
                                            <span className="text-slate-300">{txn.descriptionClean || "-"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 text-xs">Category</span>
                                            <span className="text-slate-300">{txn.category || "-"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 text-xs">Account From</span>
                                            <span className="text-slate-300">{txn.accountFrom || "-"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 text-xs">Account To</span>
                                            <span className="text-slate-300">{txn.accountTo || "-"}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-2 min-w-[100px]">
                                    {editingId === txn.id ? (
                                        <>
                                            <button onClick={() => handleSave(txn.id)} className="btn-primary py-2 px-4 text-sm w-full">Save & Map</button>
                                            <button onClick={() => setEditingId(null)} className="py-2 px-4 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEdit(txn)} className="py-2 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-sm transition-all">
                                                Edit
                                            </button>
                                            <button onClick={() => handleSkip(txn)} className="py-2 px-4 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-400 text-sm transition-all">
                                                Skip
                                            </button>
                                        </>
                                    )}
                                </div>

                            </div>
                        ))}

                        {transactions.length === 0 && (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                                <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
                                <p className="text-slate-400">You currently have no unmapped transactions.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReconciliationPage;
