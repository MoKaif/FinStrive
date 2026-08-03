import React, { useState } from 'react';
import { createTransaction, updateTransaction } from '../../Services/TransactionService';
import { Transaction } from '../../Models/Transaction';

interface ManualTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    // If provided, modal works in edit mode and will update the existing transaction
    existing?: Transaction | null;
}

const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({ isOpen, onClose, onSuccess, existing = null }) => {
    const [formData, setFormData] = useState({
        txnDate: new Date().toISOString().split('T')[0],
        descriptionRaw: '',
        descriptionClean: '',
        amount: '',
        accountFrom: '',
        accountTo: '',
        category: '',
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    React.useEffect(() => {
        if (isOpen && existing) {
            setFormData({
                txnDate: existing.txnDate.split('T')[0],
                descriptionRaw: existing.descriptionRaw || '',
                descriptionClean: existing.descriptionClean || '',
                amount: existing.amount?.toString() || '',
                accountFrom: existing.accountFrom || '',
                accountTo: existing.accountTo || '',
                category: existing.category || '',
            });
        }
    }, [isOpen, existing]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.descriptionRaw.trim() || !formData.amount) {
            setMessage({ type: 'error', text: 'Description and amount are required' });
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount)) {
            setMessage({ type: 'error', text: 'Amount must be a valid number' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            if (existing) {
                // Update existing transaction
                const updated: Partial<Transaction> = {
                    id: existing.id,
                    txnDate: new Date(formData.txnDate).toISOString(),
                    descriptionRaw: formData.descriptionRaw,
                    descriptionClean: formData.descriptionClean || undefined,
                    amount: amount,
                    accountFrom: formData.accountFrom || undefined,
                    accountTo: formData.accountTo || undefined,
                    category: formData.category || undefined,
                    source: existing.source || 'manual',
                    mapped: existing.mapped ?? true,
                };

                await updateTransaction(existing.id, updated);
                setMessage({ type: 'success', text: 'Transaction updated successfully!' });

                setTimeout(() => {
                    handleClose();
                    onSuccess();
                }, 900);
            } else {
                const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
                    txnDate: new Date(formData.txnDate).toISOString(),
                    descriptionRaw: formData.descriptionRaw,
                    descriptionClean: formData.descriptionClean || undefined,
                    amount: amount,
                    accountFrom: formData.accountFrom || undefined,
                    accountTo: formData.accountTo || undefined,
                    category: formData.category || undefined,
                    source: 'manual',
                    mapped: true,
                    closingBalance: undefined,
                };

                await createTransaction(transaction);
                setMessage({ type: 'success', text: 'Transaction created successfully!' });

                // Reset form and close after success
                setTimeout(() => {
                    handleClose();
                    onSuccess();
                }, 900);
            }
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || error.message || 'Failed to save transaction'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setFormData({
            txnDate: new Date().toISOString().split('T')[0],
            descriptionRaw: '',
            descriptionClean: '',
            amount: '',
            accountFrom: '',
            accountTo: '',
            category: '',
        });
        setMessage(null);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-term-ink/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-txn-title"
            onClick={saving ? undefined : handleClose}
        >
            <form
                className="term-panel max-h-[90vh] w-full max-w-lg overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <div className="border-b border-term-rule px-5 py-3">
                    <h2 id="manual-txn-title" className="font-display text-[15px] font-semibold text-term-text">
                        {existing ? 'Edit entry' : 'Add entry'}
                    </h2>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-term-muted">
                        {existing
                            ? `Ledger entry #${existing.id}. Saving rewrites the row and re-posts it to the ledger.`
                            : 'Posts a manual entry into the ledger alongside imported ones.'}
                    </p>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="mt-date" className="term-label mb-1.5 block">Date</label>
                            <input
                                id="mt-date"
                                type="date"
                                name="txnDate"
                                value={formData.txnDate}
                                onChange={handleInputChange}
                                required
                                className="term-input term-num"
                            />
                        </div>
                        <div>
                            <label htmlFor="mt-amount" className="term-label mb-1.5 block">Amount (₹)</label>
                            <input
                                id="mt-amount"
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                required
                                className="term-input term-num"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="mt-desc" className="term-label mb-1.5 block">Description</label>
                        <textarea
                            id="mt-desc"
                            name="descriptionRaw"
                            value={formData.descriptionRaw}
                            onChange={handleInputChange}
                            placeholder="As it appears on the statement"
                            rows={2}
                            required
                            className="term-input resize-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="mt-clean" className="term-label mb-1.5 block">Short description</label>
                        <input
                            id="mt-clean"
                            type="text"
                            name="descriptionClean"
                            value={formData.descriptionClean}
                            onChange={handleInputChange}
                            placeholder="Optional"
                            className="term-input"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="mt-from" className="term-label mb-1.5 block">Account from</label>
                            <input
                                id="mt-from"
                                type="text"
                                name="accountFrom"
                                value={formData.accountFrom}
                                onChange={handleInputChange}
                                placeholder="Assets:Banking:HDFCBank"
                                className="term-input font-mono text-[12px]"
                            />
                        </div>
                        <div>
                            <label htmlFor="mt-to" className="term-label mb-1.5 block">Account to</label>
                            <input
                                id="mt-to"
                                type="text"
                                name="accountTo"
                                value={formData.accountTo}
                                onChange={handleInputChange}
                                placeholder="Expenses:Food"
                                className="term-input font-mono text-[12px]"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="mt-category" className="term-label mb-1.5 block">Category</label>
                        <input
                            id="mt-category"
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            placeholder="Food, Transport, Investment…"
                            className="term-input"
                        />
                    </div>

                    {message && (
                        <p className={`text-[12px] ${message.type === 'success' ? 'text-term-gain' : 'text-term-loss'}`}>
                            {message.text}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-term-rule px-5 py-3">
                    <button type="button" onClick={handleClose} disabled={saving} className="term-btn">
                        Cancel
                    </button>
                    <button type="submit" disabled={saving} className="term-btn-accent">
                        {saving ? 'Saving…' : existing ? 'Save changes' : 'Add entry'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualTransactionModal;