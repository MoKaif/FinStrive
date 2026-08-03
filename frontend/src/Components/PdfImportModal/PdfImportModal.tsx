import React, { useState, useRef, DragEvent } from 'react';
import { importPdf } from '../../Services/TransactionService';

interface PdfImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PdfImportModal: React.FC<PdfImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            setFile(droppedFile);
            setMessage(null);
        } else {
            setMessage({ type: 'error', text: 'Please drop a valid PDF file' });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
                setMessage(null);
            } else {
                setMessage({ type: 'error', text: 'Please select a valid PDF file' });
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setMessage(null);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            const result = await importPdf(file);
            clearInterval(progressInterval);
            setProgress(100);
            setMessage({
                type: 'success',
                text: `Successfully imported ${result.count} transactions!`
            });

            // Wait a bit to show success message, then close and refresh
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1500);
        } catch (error: any) {
            clearInterval(progressInterval);
            setProgress(0);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || error.message || 'Failed to import PDF'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setProgress(0);
        setMessage(null);
        setUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-term-ink/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-import-title"
            onClick={uploading ? undefined : handleClose}
        >
            <div className="term-panel w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-term-rule px-5 py-3">
                    <h2 id="pdf-import-title" className="font-display text-[15px] font-semibold text-term-text">
                        Import PDF statement
                    </h2>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-term-muted">
                        Transactions are read out of the statement and added to the ledger. Bank
                        statement PDFs only.
                    </p>
                </div>

                <div className="px-5 py-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border border-dashed px-6 py-10 text-center transition-colors ${
                            isDragging ? 'border-term-accent bg-term-accent/5' : 'border-term-rule'
                        }`}
                    >
                        <p className="text-[13px] text-term-muted">Drop a PDF here</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="sr-only"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="term-btn mt-4"
                        >
                            Choose file
                        </button>
                    </div>

                    {file && (
                        <div className="mt-4 flex items-center justify-between gap-4 border border-term-rule px-3 py-2">
                            <div className="min-w-0">
                                <p className="truncate text-[12px] text-term-text">{file.name}</p>
                                <p className="term-num text-[11px] text-term-dim">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                disabled={uploading}
                                className="term-focus shrink-0 text-[11px] text-term-muted hover:text-term-loss"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {uploading && (
                        <div className="mt-4">
                            <div className="mb-1.5 flex items-baseline justify-between">
                                <span className="term-label">Uploading</span>
                                <span className="term-num text-[11px] text-term-muted">{progress}%</span>
                            </div>
                            <div className="h-px w-full bg-term-rule">
                                <div
                                    className="h-px bg-term-accent transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {message && (
                        <p className={`mt-4 text-[12px] ${message.type === 'success' ? 'text-term-gain' : 'text-term-loss'}`}>
                            {message.text}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-term-rule px-5 py-3">
                    <button onClick={handleClose} disabled={uploading} className="term-btn">
                        Cancel
                    </button>
                    <button onClick={handleUpload} disabled={!file || uploading} className="term-btn-accent">
                        {uploading ? 'Importing…' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfImportModal;
