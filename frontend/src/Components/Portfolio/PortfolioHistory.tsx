import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelinePoint } from "../../Models/Holdings";
import { amount, compact, shortMonth, signedAmount, signedPercent, statementDate, toneFor } from "../../Helpers/Money";

interface Props {
  points: TimelinePoint[];
}

// Both series are rupee amounts on one shared axis; a second scale would make
// the gap between cost and value meaningless.
const SERIES = {
  invested: { colour: "#3987e5", label: "Invested" },
  marketValue: { colour: "#d95926", label: "Market value" },
};

const TooltipCard: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point: TimelinePoint = payload[0].payload;

  return (
    <div className="term-panel px-3 py-2 shadow-lg">
      <div className="term-label mb-1.5 text-term-muted">{statementDate(label)}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-baseline gap-3">
          <span aria-hidden className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: entry.stroke }} />
          <span className="text-[11px] text-term-muted">{entry.name}</span>
          <span className="term-num ml-auto text-[12px] text-term-text">{amount(entry.value, 2)}</span>
        </div>
      ))}
      <div className="mt-1.5 flex items-baseline gap-3 border-t border-term-rule pt-1.5">
        <span className="text-[11px] text-term-muted">Return</span>
        <span className={`term-num ml-auto text-[12px] ${toneFor(point.totalReturn)}`}>
          {signedAmount(point.totalReturn)} · {signedPercent(point.returnPct)}
        </span>
      </div>
    </div>
  );
};

const PortfolioHistory: React.FC<Props> = ({ points }) => {
  const enoughData = points.length >= 2;

  return (
    <section className="term-panel" aria-labelledby="history-heading">
      <div className="flex items-baseline justify-between border-b border-term-rule px-5 py-3">
        <h2 id="history-heading" className="term-label text-term-muted">
          Cost and value by statement
        </h2>
        {enoughData && (
          <span className="term-num text-[11px] text-term-dim">
            {points.length} statements · {shortMonth(points[0].statementDate)} to{" "}
            {shortMonth(points[points.length - 1].statementDate)}
          </span>
        )}
      </div>

      {!enoughData ? (
        <p className="px-5 py-8 text-[13px] text-term-muted">
          {points.length === 0
            ? "Import a holdings statement to start tracking."
            : "One statement so far. Import next month's to see the trend."}
        </p>
      ) : (
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={points} margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="#1C232B" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="statementDate"
                tickFormatter={shortMonth}
                stroke="#1C232B"
                tick={{ fill: "#7E8994", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                tickLine={false}
                axisLine={{ stroke: "#1C232B" }}
              />
              <YAxis
                tickFormatter={compact}
                stroke="#1C232B"
                tick={{ fill: "#7E8994", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<TooltipCard />} cursor={{ stroke: "#67727E", strokeWidth: 1 }} />
              <Legend
                verticalAlign="top"
                align="left"
                height={28}
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#7E8994", paddingLeft: 8 }}
              />
              <Line
                type="linear"
                dataKey="invested"
                name={SERIES.invested.label}
                stroke={SERIES.invested.colour}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 0, fill: SERIES.invested.colour }}
                activeDot={{ r: 5, stroke: "#0C1015", strokeWidth: 2 }}
              />
              <Line
                type="linear"
                dataKey="marketValue"
                name={SERIES.marketValue.label}
                stroke={SERIES.marketValue.colour}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 0, fill: SERIES.marketValue.colour }}
                activeDot={{ r: 5, stroke: "#0C1015", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default PortfolioHistory;
