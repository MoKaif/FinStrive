import React from "react";
import { AssetClass, Section } from "../../Models/Holdings";
import { amount, percent } from "../../Helpers/Money";

interface Props {
  sections: Section[];
  totalMarketValue: number;
}

/**
 * Fixed hue per asset class, assigned in this order and never cycled, so a class
 * keeps its colour whichever statement is on screen.
 */
export const ASSET_COLOURS: Record<AssetClass, string> = {
  MutualFund: "#3987e5",
  StockOrEtf: "#d95926",
  ReitInvit: "#199e70",
  Ppf: "#c98500",
  Other: "#7E8994",
};

/** A label only fits inside a segment once it is wide enough to hold it. */
const INLINE_LABEL_MIN_PCT = 12;

const AllocationStrip: React.FC<Props> = ({ sections, totalMarketValue }) => {
  const parts = sections.filter((s) => s.marketValue > 0);
  if (parts.length === 0 || totalMarketValue <= 0) return null;

  return (
    <section className="term-panel" aria-labelledby="allocation-heading">
      <div className="flex items-baseline justify-between border-b border-term-rule px-5 py-3">
        <h2 id="allocation-heading" className="term-label text-term-muted">
          Allocation by market value
        </h2>
        <span className="term-num text-[11px] text-term-dim">{amount(totalMarketValue)} total</span>
      </div>

      <div className="px-5 py-4">
        {/* 2px gaps let adjacent segments read as separate marks without a border. */}
        <div className="flex h-9 w-full gap-[2px]" role="img" aria-label="Portfolio allocation by asset class">
          {parts.map((section) => {
            const share = (section.marketValue / totalMarketValue) * 100;
            return (
              <div
                key={section.assetClass}
                className="relative flex items-center justify-center overflow-hidden first:rounded-l-[3px] last:rounded-r-[3px]"
                style={{ width: `${share}%`, backgroundColor: ASSET_COLOURS[section.assetClass] }}
                title={`${section.label} — ${percent(share)}`}
              >
                {share >= INLINE_LABEL_MIN_PCT && (
                  <span className="term-num px-2 text-[11px] font-medium text-term-ink">{percent(share, 1)}</span>
                )}
              </div>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
          {parts.map((section) => (
            <li key={section.assetClass} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="mt-[3px] h-2 w-2 shrink-0 self-start rounded-[1px]"
                style={{ backgroundColor: ASSET_COLOURS[section.assetClass] }}
              />
              <span className="text-[12px] text-term-muted">{section.label}</span>
              <span className="term-num text-[12px] text-term-text">{percent(section.weight, 1)}</span>
              <span className="term-num text-[11px] text-term-dim">{amount(section.marketValue)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AllocationStrip;
