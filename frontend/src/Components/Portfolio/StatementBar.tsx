import React, { useRef } from "react";
import { SnapshotDetail, SnapshotSummary } from "../../Models/Holdings";
import { statementDate } from "../../Helpers/Money";

interface Props {
  snapshots: SnapshotSummary[];
  current: SnapshotDetail | null;
  importing: boolean;
  onSelect: (id: number) => void;
  onFile: (file: File) => void;
  onDelete: () => void;
}

const StatementBar: React.FC<Props> = ({ snapshots, current, importing, onSelect, onFile, onDelete }) => {
  const input = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Reset so re-picking the same file still fires a change event.
    e.target.value = "";
  };

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-term-rule pb-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight text-term-text">
          Holdings
        </h1>
        <p className="mt-2 text-[12px] text-term-muted">
          {current ? (
            <>
              {current.investorName ?? "Portfolio"}
              <span className="text-term-dim"> · </span>
              {current.holdingsCount} positions
              <span className="text-term-dim"> · imported {statementDate(current.uploadedAt)}</span>
            </>
          ) : (
            "Import a Value Research holdings statement to begin."
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {snapshots.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="term-label">Statement</span>
            <select
              className="term-num term-focus border border-term-rule bg-term-panel px-3 py-2 text-[12px] text-term-text"
              value={current?.id ?? ""}
              onChange={(e) => onSelect(Number(e.target.value))}
            >
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {statementDate(snapshot.statementDate)}
                </option>
              ))}
            </select>
          </label>
        )}

        {current && (
          <button
            type="button"
            onClick={onDelete}
            className="term-focus border border-term-rule px-3 py-2 text-[12px] text-term-muted hover:border-term-loss/50 hover:text-term-loss"
          >
            Delete
          </button>
        )}

        <input
          ref={input}
          type="file"
          accept=".xls,.xlsx"
          onChange={pick}
          className="sr-only"
          id="statement-file"
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={importing}
          className="term-focus border border-term-accent bg-term-accent/10 px-4 py-2 text-[12px] font-medium text-term-accent hover:bg-term-accent/20 disabled:opacity-50"
        >
          {importing ? "Importing…" : "Import statement"}
        </button>
      </div>
    </header>
  );
};

export default StatementBar;
