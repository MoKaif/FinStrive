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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-card max-w-2xl w-full p-8 animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Import PDF Statement</h2>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="text-slate-400 hover:text-white transition-colors text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-6xl">📄</div>
                        <div>
                            <p className="text-white font-medium mb-2">
                                {file ? file.name : 'Drag and drop your PDF here'}
                            </p>
                            <p className="text-slate-400 text-sm">or</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn-primary"
                        >
                            Browse Files
                        </button>
                        {file && (
                            <div className="mt-4 p-4 bg-white/5 rounded-lg w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📄</span>
                                        <div>
                                            <p className="text-white font-medium">{file.name}</p>
                                            <p className="text-slate-400 text-sm">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        disabled={uploading}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Uploading...</span>
                            <span className="text-white text-sm font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <div
                        className={`mt-6 p-4 rounded-lg ${message.type === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 mt-8">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? 'Importing...' : 'Import'}
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm">
                        <strong>Note:</strong> Only PDF bank statements are supported. The system will automatically extract transactions and add them to your database.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PdfImportModal;
