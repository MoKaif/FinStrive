import React from "react";
import { Holding, Section } from "../../Models/Holdings";
import {
  amount,
  percent,
  signedAmount,
  signedPercent,
  toneFor,
  units as formatUnits,
} from "../../Helpers/Money";
import { ASSET_COLOURS } from "./AllocationStrip";

interface Props {
  sections: Section[];
  showChange: boolean;
}

/** One instrument, with the folios it is held across. */
interface Group {
  key: string;
  counted: Holding[];
  invested: number;
  marketValue: number;
  totalReturn: number;
  weight: number;
  changeMarketValue: number | null;
}

/**
 * Rows for the same instrument are nested under one instrument line. A statement
 * that splits a fund across folios also repeats it as a folio-less "Multiple"
 * summary row; that row is excluded upstream, so the instrument line here is the
 * sum of the real folios rather than the statement's duplicate.
 */
const groupHoldings = (section: Section, showChange: boolean): Group[] => {
  const order: string[] = [];
  const buckets = new Map<string, Holding[]>();

  for (const holding of section.holdings) {
    if (holding.excludedFromTotals) continue;
    if (!buckets.has(holding.groupKey)) {
      buckets.set(holding.groupKey, []);
      order.push(holding.groupKey);
    }
    buckets.get(holding.groupKey)!.push(holding);
  }

  return order.map((key) => {
    const counted = buckets.get(key)!;
    const changes = counted.map((h) => h.changeMarketValue).filter((c): c is number => c !== null);

    return {
      key,
      counted,
      invested: counted.reduce((sum, h) => sum + h.invested, 0),
      marketValue: counted.reduce((sum, h) => sum + h.marketValue, 0),
      totalReturn: counted.reduce((sum, h) => sum + h.totalReturn, 0),
      weight: counted.reduce((sum, h) => sum + h.weight, 0),
      changeMarketValue: showChange && changes.length > 0 ? changes.reduce((a, b) => a + b, 0) : null,
    };
  });
};

const Num: React.FC<{ children: React.ReactNode; tone?: string; className?: string }> = ({
  children,
  tone = "text-term-text",
  className = "",
}) => <td className={`term-num whitespace-nowrap px-3 py-2 text-right text-[12px] ${tone} ${className}`}>{children}</td>;

const AdjustedTag: React.FC = () => (
  <span
    className="ml-2 border border-term-accent/40 px-1 font-mono text-[9px] uppercase tracking-wider text-term-accent"
    title="The invested amount was corrected from what the statement reported."
  >
    adj
  </span>
);

const WeightBar: React.FC<{ weight: number; colour: string }> = ({ weight, colour }) => (
  <div className="flex items-center justify-end gap-2">
    <div aria-hidden className="h-[3px] w-12 bg-term-rule">
      <div
        className="h-full"
        style={{ width: `${Math.min(100, weight)}%`, backgroundColor: colour, opacity: 0.75 }}
      />
    </div>
    <span className="w-11 text-right">{percent(weight, 1)}</span>
  </div>
);

const HoldingsTable: React.FC<Props> = ({ sections, showChange }) => (
  <div className="space-y-5">
    {sections.map((section) => {
      const colour = ASSET_COLOURS[section.assetClass];
      const groups = groupHoldings(section, showChange);
      if (groups.length === 0) return null;

      return (
        <section key={section.assetClass} className="term-panel" aria-labelledby={`sec-${section.assetClass}`}>
          <header className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-term-rule px-5 py-3">
            <span aria-hidden className="h-3 w-[3px]" style={{ backgroundColor: colour }} />
            <h2 id={`sec-${section.assetClass}`} className="font-display text-[15px] font-semibold text-term-text">
              {section.label}
            </h2>
            <span className="term-num text-[11px] text-term-dim">
              {groups.length} {groups.length === 1 ? "instrument" : "instruments"}
            </span>

            <div className="term-num ml-auto flex items-baseline gap-5 text-[12px]">
              <span className="text-term-muted">
                {amount(section.invested)} <span className="text-term-dim">→</span> {amount(section.marketValue)}
              </span>
              <span className={toneFor(section.totalReturn)}>{signedAmount(section.totalReturn)}</span>
              <span className={toneFor(section.returnPct)}>{signedPercent(section.returnPct)}</span>
              <span className="w-14 text-right text-term-muted">{percent(section.weight, 1)}</span>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] border-collapse">
              <thead>
                <tr className="border-b border-term-rule bg-term-raised">
                  <th scope="col" className="term-label px-5 py-2 text-left font-normal">
                    Instrument
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Units
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Price
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Invested
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Value
                  </th>
                  {showChange && (
                    <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                      Δ Value
                    </th>
                  )}
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Return
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    Ret %
                  </th>
                  <th scope="col" className="term-label px-3 py-2 text-right font-normal">
                    XIRR
                  </th>
                  <th scope="col" className="term-label px-5 py-2 text-right font-normal">
                    Weight
                  </th>
                </tr>
              </thead>

              <tbody>
                {groups.map((group) => {
                  const split = group.counted.length > 1;
                  const lead = group.counted[0];

                  return (
                    <React.Fragment key={group.key}>
                      <tr className="border-b border-term-rule/70 hover:bg-term-raised/60">
                        <td className="px-5 py-2">
                          <div className="flex items-baseline">
                            <span className="text-[13px] text-term-text">{lead.name}</span>
                            {lead.isEtf && (
                              <span className="term-label ml-2 text-term-dim" title="Exchange-traded fund">
                                etf
                              </span>
                            )}
                            {group.counted.some((h) => h.costBasisAdjusted) && <AdjustedTag />}
                            {lead.isNew && (
                              <span className="term-label ml-2 text-term-accent" title="First appeared in this statement">
                                new
                              </span>
                            )}
                          </div>
                          <div className="term-num mt-0.5 text-[10.5px] text-term-dim">
                            {split ? (
                              <>
                                {group.counted.length} folios
                                {lead.category ? ` · ${lead.category}` : ""}
                              </>
                            ) : (
                              <>
                                {lead.account ?? "—"}
                                {lead.category ? ` · ${lead.category}` : ""}
                              </>
                            )}
                            {lead.isin ? ` · ${lead.isin}` : ""}
                          </div>
                        </td>

                        <Num tone="text-term-muted">
                          {split ? formatUnits(group.counted.reduce((s, h) => s + (h.units ?? 0), 0)) : formatUnits(lead.units)}
                        </Num>
                        <Num tone="text-term-muted">{lead.unitPrice === null ? "—" : amount(lead.unitPrice, 2)}</Num>
                        <Num>
                          {amount(group.invested, 2)}
                          {group.counted.some((h) => h.costBasisAdjusted) && (
                            <div className="text-[10px] text-term-dim line-through decoration-term-loss/50">
                              {amount(group.counted.reduce((s, h) => s + h.investedReported, 0), 2)}
                            </div>
                          )}
                        </Num>
                        <Num>{amount(group.marketValue, 2)}</Num>
                        {showChange && (
                          <Num tone={toneFor(group.changeMarketValue)}>
                            {group.changeMarketValue === null ? "—" : signedAmount(group.changeMarketValue, 2)}
                          </Num>
                        )}
                        <Num tone={toneFor(group.totalReturn)}>{signedAmount(group.totalReturn, 2)}</Num>
                        <Num tone={toneFor(group.totalReturn)}>
                          {group.invested === 0 ? "—" : signedPercent((group.totalReturn / group.invested) * 100)}
                        </Num>
                        <Num tone={split ? "text-term-dim" : toneFor(lead.xirr)}>
                          {split ? "—" : signedPercent(lead.xirr, 1)}
                        </Num>
                        <td className="term-num px-5 py-2 text-right text-[12px] text-term-muted">
                          <WeightBar weight={group.weight} colour={colour} />
                        </td>
                      </tr>

                      {/* Folio breakdown: the instrument line above is their sum. */}
                      {split &&
                        group.counted.map((holding, index) => {
                          const last = index === group.counted.length - 1;
                          return (
                            <tr
                              key={holding.id}
                              className="border-b border-term-rule/40 bg-term-ink/40 hover:bg-term-raised/40"
                            >
                              <td className="py-1.5 pl-5 pr-3">
                                <span className="term-num text-[11px] text-term-dim">
                                  <span aria-hidden className="mr-2 text-term-rule">
                                    {last ? "└" : "├"}
                                  </span>
                                  {holding.account ?? "—"}
                                </span>
                              </td>
                              <Num tone="text-term-dim" className="!text-[11px]">
                                {formatUnits(holding.units)}
                              </Num>
                              <Num tone="text-term-dim" className="!text-[11px]">
                                {holding.unitPrice === null ? "—" : amount(holding.unitPrice, 2)}
                              </Num>
                              <Num tone="text-term-muted" className="!text-[11px]">
                                {amount(holding.invested, 2)}
                              </Num>
                              <Num tone="text-term-muted" className="!text-[11px]">
                                {amount(holding.marketValue, 2)}
                              </Num>
                              {showChange && (
                                <Num tone={toneFor(holding.changeMarketValue)} className="!text-[11px]">
                                  {holding.changeMarketValue === null
                                    ? "—"
                                    : signedAmount(holding.changeMarketValue, 2)}
                                </Num>
                              )}
                              <Num tone={toneFor(holding.totalReturn)} className="!text-[11px]">
                                {signedAmount(holding.totalReturn, 2)}
                              </Num>
                              <Num tone={toneFor(holding.returnPct)} className="!text-[11px]">
                                {signedPercent(holding.returnPct)}
                              </Num>
                              <Num tone={toneFor(holding.xirr)} className="!text-[11px]">
                                {signedPercent(holding.xirr, 1)}
                              </Num>
                              <Num tone="text-term-dim" className="!text-[11px] !px-5">
                                {percent(holding.weight, 1)}
                              </Num>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );
    })}
  </div>
);

export default HoldingsTable;
