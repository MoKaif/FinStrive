import React, { useEffect, useState } from "react";
import { CostBasisOverride } from "../../Models/Holdings";

interface Props {
  rule: CostBasisOverride | null;
  saving: boolean;
  onSave: (values: {
    isin: string;
    instrumentName: string | null;
    investedAmount: number;
    reason: string | null;
    isActive: boolean;
  }) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

const field =
  "w-full bg-term-ink border border-term-rule px-3 py-2 text-[13px] text-term-text placeholder-term-dim " +
  "focus:outline-none focus:border-term-accent transition-colors";

/**
 * Editor for a standing cost correction. Corrections are keyed by ISIN and
 * re-applied to every stored statement on save, so history stays consistent
 * with the current view.
 */
const CostBasisDialog: React.FC<Props> = ({ rule, saving, onSave, onDelete, onClose }) => {
  const [isin, setIsin] = useState(rule?.isin ?? "");
  const [name, setName] = useState(rule?.instrumentName ?? "");
  const [invested, setInvested] = useState(rule ? String(rule.investedAmount) : "");
  const [reason, setReason] = useState(rule?.reason ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = isin.trim().toUpperCase();
    const parsed = Number(invested);

    if (trimmed.length !== 12) {
      setError("An ISIN is 12 characters, for example INE976I01016.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter the amount actually invested, as a number.");
      return;
    }

    setError(null);
    onSave({
      isin: trimmed,
      instrumentName: name.trim() || null,
      investedAmount: parsed,
      reason: reason.trim() || null,
      isActive: rule?.isActive ?? true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-term-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cost-basis-title"
      onClick={onClose}
    >
      <form
        className="term-panel w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="border-b border-term-rule px-5 py-3">
          <h2 id="cost-basis-title" className="font-display text-[15px] font-semibold text-term-text">
            {rule ? "Edit cost correction" : "Add cost correction"}
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-term-muted">
            Replaces the invested amount the statement reports for this instrument, on this and every
            future import.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="cb-isin" className="term-label mb-1.5 block">
              ISIN
            </label>
            <input
              id="cb-isin"
              className={`${field} font-mono uppercase`}
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
              placeholder="INE976I01016"
              maxLength={12}
              readOnly={!!rule}
            />
          </div>

          <div>
            <label htmlFor="cb-name" className="term-label mb-1.5 block">
              Instrument name
            </label>
            <input
              id="cb-name"
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tata Capital Ltd."
            />
          </div>

          <div>
            <label htmlFor="cb-amount" className="term-label mb-1.5 block">
              Amount invested (₹)
            </label>
            <input
              id="cb-amount"
              className={`${field} term-num`}
              value={invested}
              onChange={(e) => setInvested(e.target.value)}
              inputMode="decimal"
              placeholder="14996"
            />
          </div>

          <div>
            <label htmlFor="cb-reason" className="term-label mb-1.5 block">
              Why
            </label>
            <input
              id="cb-reason"
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="IPO allotment; no buy transaction in the statement."
            />
          </div>

          {error && <p className="text-[12px] text-term-loss">{error}</p>}
        </div>

        <div className="flex items-center gap-3 border-t border-term-rule px-5 py-3">
          {rule && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(rule.id)}
              className="term-focus font-mono text-[11px] text-term-loss hover:underline"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="term-focus ml-auto border border-term-rule px-4 py-2 text-[12px] text-term-muted hover:text-term-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="term-focus border border-term-accent bg-term-accent/10 px-4 py-2 text-[12px] font-medium text-term-accent hover:bg-term-accent/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save correction"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CostBasisDialog;
