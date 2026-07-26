import React from "react";
import { Adjustment, CostBasisOverride } from "../../Models/Holdings";
import { amount, rupees } from "../../Helpers/Money";

interface Props {
  adjustments: Adjustment[];
  warnings: string[];
  overrides: CostBasisOverride[];
  onEditOverride: (rule: CostBasisOverride) => void;
  onAddOverride: () => void;
}

const KIND_LABEL: Record<Adjustment["kind"], string> = {
  "cost-basis": "Cost corrected",
  "folio-rollup": "Rollup dropped",
  duplicate: "Duplicate dropped",
};

const KIND_TONE: Record<Adjustment["kind"], string> = {
  "cost-basis": "text-term-accent border-term-accent/40",
  "folio-rollup": "text-term-muted border-term-rule",
  duplicate: "text-term-muted border-term-rule",
};

/**
 * Everything the import changed, and everything it could not reconcile. The
 * statement is treated as evidence rather than truth, so each departure from it
 * is stated rather than absorbed silently.
 */
const AdjustmentsPanel: React.FC<Props> = ({
  adjustments,
  warnings,
  overrides,
  onEditOverride,
  onAddOverride,
}) => (
  <section className="term-panel" id="adjustments" aria-labelledby="adjustments-heading">
    <div className="flex items-baseline justify-between border-b border-term-rule px-5 py-3">
      <h2 id="adjustments-heading" className="term-label text-term-muted">
        Corrections applied to this statement
      </h2>
      <button
        type="button"
        onClick={onAddOverride}
        className="term-focus font-mono text-[11px] text-term-accent hover:underline"
      >
        + Add cost correction
      </button>
    </div>

    {adjustments.length === 0 ? (
      <p className="px-5 py-4 text-[13px] text-term-muted">
        Nothing needed correcting. Every row reconciled against the statement's own totals.
      </p>
    ) : (
      <ul className="divide-y divide-term-rule/60">
        {adjustments.map((adjustment, index) => (
          <li key={`${adjustment.kind}-${adjustment.isin ?? adjustment.name}-${index}`} className="px-5 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className={`border px-1.5 font-mono text-[9px] uppercase tracking-wider ${KIND_TONE[adjustment.kind]}`}
              >
                {KIND_LABEL[adjustment.kind]}
              </span>
              <span className="text-[13px] text-term-text">{adjustment.name}</span>
              {adjustment.account && (
                <span className="term-num text-[11px] text-term-dim">{adjustment.account}</span>
              )}

              {adjustment.kind === "cost-basis" && (
                <span className="term-num ml-auto text-[12px]">
                  <span className="text-term-muted line-through decoration-term-loss/50">
                    {amount(adjustment.from, 2)}
                  </span>
                  <span className="mx-2 text-term-dim">→</span>
                  <span className="text-term-text">{amount(adjustment.to, 2)}</span>
                </span>
              )}
              {adjustment.kind !== "cost-basis" && (
                <span className="term-num ml-auto text-[12px] text-term-dim">
                  {amount(adjustment.from, 2)} excluded
                </span>
              )}
            </div>
            {adjustment.note && (
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-term-muted">{adjustment.note}</p>
            )}
          </li>
        ))}
      </ul>
    )}

    {warnings.length > 0 && (
      <div className="border-t border-term-rule px-5 py-3">
        <div className="term-label mb-2 text-term-loss">Could not reconcile</div>
        <ul className="space-y-1.5">
          {warnings.map((warning, index) => (
            <li key={index} className="text-[11.5px] leading-relaxed text-term-muted">
              {warning}
            </li>
          ))}
        </ul>
      </div>
    )}

    {overrides.length > 0 && (
      <div className="border-t border-term-rule px-5 py-3">
        <div className="term-label mb-2">Standing cost corrections · applied to every import</div>
        <ul className="space-y-1.5">
          {overrides.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-baseline gap-x-3 text-[12px]">
              <span className="term-num text-term-dim">{rule.isin}</span>
              <span className="text-term-muted">{rule.instrumentName ?? "—"}</span>
              <span className="term-num text-term-text">{rupees(rule.investedAmount, 2)}</span>
              {!rule.isActive && <span className="term-label text-term-loss">paused</span>}
              <button
                type="button"
                onClick={() => onEditOverride(rule)}
                className="term-focus ml-auto font-mono text-[11px] text-term-accent hover:underline"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
);

export default AdjustmentsPanel;
