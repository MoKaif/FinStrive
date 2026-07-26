import React from "react";
import { SnapshotDetail } from "../../Models/Holdings";
import { amount, signedAmount, signedPercent, statementDate, toneFor } from "../../Helpers/Money";

interface Props {
  snapshot: SnapshotDetail;
  onShowAdjustments: () => void;
}

const Figure: React.FC<{
  label: string;
  value: string;
  tone?: string;
  sub?: React.ReactNode;
}> = ({ label, value, tone = "text-term-text", sub }) => (
  <div className="flex-1 min-w-[9rem] px-5 py-4">
    <div className="term-label">{label}</div>
    <div className={`term-num mt-2 text-[26px] leading-none font-medium ${tone}`}>{value}</div>
    {sub && <div className="mt-2 text-[11px] leading-tight text-term-muted">{sub}</div>}
  </div>
);

/**
 * The corrected position, with the statement's own headline shown beneath it.
 * Value Research understates cost on holdings it never saw a buy for, so the two
 * sets of numbers genuinely disagree — showing both is the point of the page,
 * not a footnote.
 */
const ReconciliationBlock: React.FC<Props> = ({ snapshot, onShowAdjustments }) => {
  const corrections = snapshot.adjustments.length;

  // Only worth showing the statement's version when it actually differs.
  const investedDiffers =
    snapshot.reportedInvested !== null && Math.abs(snapshot.reportedInvested - snapshot.totalInvested) >= 1;
  const returnDiffers =
    snapshot.reportedTotalReturn !== null && Math.abs(snapshot.reportedTotalReturn - snapshot.totalReturn) >= 1;
  const anyDiffers = investedDiffers || returnDiffers;

  return (
    <section className="term-panel" aria-labelledby="position-heading">
      <div className="flex items-baseline justify-between border-b border-term-rule px-5 py-3">
        <h2 id="position-heading" className="term-label text-term-muted">
          Position as on {statementDate(snapshot.statementDate)}
        </h2>
        {snapshot.previousSnapshot && (
          <span className="term-num text-[11px] text-term-muted">
            <span className={toneFor(snapshot.changeMarketValue)}>{signedAmount(snapshot.changeMarketValue)}</span>
            <span className="text-term-dim"> since {statementDate(snapshot.previousSnapshot.statementDate)}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap divide-y divide-term-rule sm:divide-y-0 sm:divide-x sm:divide-term-rule">
        <Figure label="Invested" value={amount(snapshot.totalInvested)} />
        <Figure label="Market value" value={amount(snapshot.totalMarketValue)} />
        <Figure
          label="Total return"
          value={signedAmount(snapshot.totalReturn)}
          tone={toneFor(snapshot.totalReturn)}
        />
        <Figure
          label="Return"
          value={signedPercent(snapshot.returnPct)}
          tone={toneFor(snapshot.returnPct)}
        />
      </div>

      {anyDiffers && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-term-rule px-5 py-3">
          <span className="term-label">Statement reports</span>

          {investedDiffers && (
            <span className="term-num text-[12px] text-term-muted">
              <span className="line-through decoration-term-loss/60">{amount(snapshot.reportedInvested)}</span>
              <span className="text-term-dim"> invested</span>
            </span>
          )}
          {returnDiffers && (
            <span className="term-num text-[12px] text-term-muted">
              <span className="line-through decoration-term-loss/60">
                {signedAmount(snapshot.reportedTotalReturn)}
              </span>
              <span className="text-term-dim"> return</span>
            </span>
          )}
          {snapshot.reportedReturnPct !== null && (
            <span className="term-num text-[12px] text-term-muted">
              <span className="line-through decoration-term-loss/60">
                {signedPercent(snapshot.reportedReturnPct)}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={onShowAdjustments}
            className="term-focus term-num ml-auto text-[12px] text-term-accent hover:underline"
          >
            {corrections} {corrections === 1 ? "correction" : "corrections"} applied →
          </button>
        </div>
      )}
    </section>
  );
};

export default ReconciliationBlock;
