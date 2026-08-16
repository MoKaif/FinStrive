import React, { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import DeletePortfolio from "../DeletePortfolio/DeletePortfolio";
import { PortfolioGet } from "../../../Models/Portfolio";

interface Props {
  portfolioValue: PortfolioGet;
  onPortfolioDelete: (e: SyntheticEvent) => void;
}

const CardPortfolio = ({ portfolioValue, onPortfolioDelete }: Props) => {
  return (
    <div className="flex min-w-[10rem] flex-1 items-center justify-between gap-4 bg-term-panel px-4 py-3">
      <Link
        to={`/company/${portfolioValue.symbol}/company-profile`}
        className="term-num term-focus text-[13px] text-term-text hover:text-term-accent"
      >
        {portfolioValue.symbol}
      </Link>
      <DeletePortfolio
        portfolioValue={portfolioValue.symbol}
        onPortfolioDelete={onPortfolioDelete}
      />
    </div>
  );
};

export default CardPortfolio;
