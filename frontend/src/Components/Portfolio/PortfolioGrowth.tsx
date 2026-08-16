import React, { useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PortfolioTimeline } from "../../Models/TransactionHistory";
import { amount, compact, rupees, signedAmount, statementDate, toneFor } from "../../Helpers/Money";

interface Props {
  timeline: PortfolioTimeline | null;
  importing: boolean;
  onFile: (file: File) => void;
}

// Two rupee measures on one shared axis. Cost and value are directly comparable,
// and the gap between them is the return — a second scale would destroy that.
const COST = "#3987e5";
const VALUE = "#d95926";

const INK = "#0C1015";
const RULE = "#1C232B";
const MUTED = "#7E8994";
const MONO = "IBM Plex Mono, monospace";
const axisTick = { fill: MUTED, fontSize: 11, fontFamily: MONO };

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

const GrowthTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const gain = point.estimatedValue - point.investedCost;

  return (
    <div className="term-panel px-3 py-2 shadow-lg">
      <div className="term-label mb-1.5 text-term-muted">{statementDate(label)}</div>

      <div className="flex items-baseline gap-3">
        <span aria-hidden className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: COST }} />
        <span className="text-[11px] text-term-muted">Invested</span>
        <span className="term-num ml-auto text-[12px] text-term-text">{amount(point.investedCost, 2)}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: VALUE }} />
        <span className="text-[11px] text-term-muted">Value (est.)</span>
        <span className="term-num ml-auto text-[12px] text-term-text">{amount(point.estimatedValue, 2)}</span>
      </div>

      <div className="mt-1.5 space-y-0.5 border-t border-term-rule pt-1.5">
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] text-term-muted">Unrealised</span>
          <span className={`term-num ml-auto text-[12px] ${toneFor(gain)}`}>{signedAmount(gain)}</span>
        </div>
        {point.contributed > 0 && (
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] text-term-muted">Added this month</span>
            <span className="term-num ml-auto text-[12px] text-term-text">{amount(point.contributed, 2)}</span>
          </div>
        )}
        {point.dividendsReceived > 0 && (
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] text-term-muted">Dividends</span>
            <span className="term-num ml-auto text-[12px] text-term-gain">
              {amount(point.dividendsReceived, 2)}
            </span>
          </div>
        )}
        {point.valuedPositions < point.openPositions && (
          <p className="pt-1 text-[10.5px] leading-snug text-term-dim">
            {point.openPositions - point.valuedPositions} of {point.openPositions} positions unvalued here
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * The portfolio over the whole transaction history.
 *
 * The cost line is exact. The value line is a reconstruction: the export prices a
 * holding only on days it was traded, so quiet months repeat the last known
 * prices. That is stated on the panel rather than left for the reader to discover.
 */
const PortfolioGrowth: React.FC<Props> = ({ timeline, importing, onFile }) => {
  const input = useRef<HTMLInputElement>(null);
  const [showTable, setShowTable] = useState(false);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  const uploadButton = (
    <>
      <input ref={input} type="file" accept=".xls,.xlsx" onChange={pick} className="sr-only" id="history-file" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={importing}
        className="term-btn py-1.5"
      >
        {importing ? "Importing…" : timeline?.points.length ? "Replace history" : "Import history"}
      </button>
    </>
  );

  const points = timeline?.points ?? [];

  if (points.length < 2) {
    return (
      <section className="term-panel" aria-labelledby="growth-heading">
        <div className="term-caption">
          <h2 id="growth-heading" className="term-label text-term-muted">
            Portfolio since inception
          </h2>
          {uploadButton}
        </div>
        <div className="px-5 py-10">
          <p className="max-w-lg text-[13px] leading-relaxed text-term-muted">
            Import the Value Research <span className="text-term-text">transaction history</span> export to
            chart cost and value across every year you have held investments, rather than only the months
            you have imported a statement for.
          </p>
          <p className="mt-3 max-w-lg text-[11.5px] leading-relaxed text-term-dim">
            Value Research → Portfolio → Transaction History → download as .xls, period "All-time".
          </p>
        </div>
      </section>
    );
  }

  const latest = points[points.length - 1];
  const gain = latest.estimatedValue - latest.investedCost;

  return (
    <section className="term-panel" aria-labelledby="growth-heading">
      <div className="term-caption">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="growth-heading" className="term-label text-term-muted">
            Portfolio since inception
          </h2>
          {timeline?.firstTxnDate && (
            <span className="term-num text-[11px] text-term-dim">
              {monthLabel(timeline.firstTxnDate)} — {monthLabel(latest.date)} · {points.length} months
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowTable((open) => !open)}
            className="term-focus text-[11px] text-term-muted hover:text-term-text"
          >
            {showTable ? "Hide table" : "Table"}
          </button>
          {uploadButton}
        </div>
      </div>

      <div className="grid gap-px border-b border-term-rule bg-term-rule sm:grid-cols-3">
        <div className="bg-term-panel px-4 py-3">
          <p className="term-label">Invested</p>
          <p className="term-num mt-1.5 text-[18px] leading-none text-term-text">
            {rupees(latest.investedCost, 2)}
          </p>
        </div>
        <div className="bg-term-panel px-4 py-3">
          <p className="term-label">Est. value</p>
          <p className="term-num mt-1.5 text-[18px] leading-none text-term-text">
            {rupees(latest.estimatedValue, 2)}
          </p>
        </div>
        <div className="bg-term-panel px-4 py-3">
          <p className="term-label">Dividends received</p>
          <p className="term-num mt-1.5 text-[18px] leading-none text-term-gain">
            {rupees(timeline?.totalDividends ?? 0, 2)}
          </p>
        </div>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={points} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
            <CartesianGrid stroke={RULE} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={monthLabel}
              stroke={RULE}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: RULE }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={compact}
              stroke={RULE}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<GrowthTooltip />} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: MUTED, paddingLeft: 8 }}
            />
            {/* The shaded band is the same two numbers, not a third series, so it
                carries the cost colour at low opacity and stays out of the legend. */}
            <Area
              type="linear"
              dataKey="estimatedValue"
              stroke="none"
              fill={COST}
              fillOpacity={0.07}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="linear"
              dataKey="investedCost"
              name="Invested"
              stroke={COST}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: INK, strokeWidth: 2 }}
            />
            <Line
              type="linear"
              dataKey="estimatedValue"
              name="Value (estimated)"
              stroke={VALUE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: INK, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="border-t border-term-rule px-5 py-2.5 text-[11px] leading-relaxed text-term-dim">
        Invested is exact. Value is estimated — the export prices a holding only on days it was traded, so
        months with no activity repeat the last known prices. Imported statements are the authority on value.
        Unrealised {signedAmount(gain)} at {monthLabel(latest.date)}.
      </p>

      {showTable && (
        <div className="max-h-80 overflow-auto border-t border-term-rule">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 bg-term-raised">
              <tr className="border-b border-term-rule">
                <th className="term-th">Month</th>
                <th className="term-th text-right">Invested ₹</th>
                <th className="term-th text-right">Est. value ₹</th>
                <th className="term-th text-right">Added ₹</th>
                <th className="term-th text-right">Txns</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.date} className="border-b border-term-rule/60 hover:bg-term-raised">
                  <td className="term-td term-num text-term-muted">{monthLabel(point.date)}</td>
                  <td className="term-td term-num text-right">{amount(point.investedCost, 2)}</td>
                  <td className="term-td term-num text-right">{amount(point.estimatedValue, 2)}</td>
                  <td className="term-td term-num text-right text-term-muted">
                    {point.contributed > 0 ? amount(point.contributed, 2) : "—"}
                  </td>
                  <td className="term-td term-num text-right text-term-dim">{point.transactionCount || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PortfolioGrowth;
