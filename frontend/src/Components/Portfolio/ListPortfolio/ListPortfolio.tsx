import React, { SyntheticEvent } from "react";
import CardPortfolio from "../CardPortfolio/CardPortfolio";
import { PortfolioGet } from "../../../Models/Portfolio";

interface Props {
  portfolioValues: PortfolioGet[];
  onPortfolioDelete: (e: SyntheticEvent) => void;
}

const ListPortfolio = ({ portfolioValues, onPortfolioDelete }: Props) => {
  return (
    <section id="portfolio" className="term-panel">
      <div className="flex items-baseline justify-between border-b border-term-rule px-4 py-3">
        <h2 className="term-label text-term-muted">Watchlist</h2>
        <span className="term-num text-[11px] text-term-dim">{portfolioValues.length}</span>
      </div>
      {portfolioValues.length > 0 ? (
        <div className="flex flex-wrap gap-px bg-term-rule">
          {portfolioValues.map((portfolioValue) => (
            <CardPortfolio
              key={portfolioValue.symbol}
              portfolioValue={portfolioValue}
              onPortfolioDelete={onPortfolioDelete}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-[13px] text-term-muted">
          Nothing on the watchlist yet.
        </p>
      )}
    </section>
  );
};

export default ListPortfolio;
