import React, { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import "./Card.css";
import { CompanySearch } from "../../company";
import AddPortfolio from "../Portfolio/AddPortfolio/AddPortfolio";

interface Props {
  id: string;
  searchResult: CompanySearch;
  onPortfolioCreate: (e: SyntheticEvent) => void;
}

const Card: React.FC<Props> = ({
  id,
  searchResult,
  onPortfolioCreate,
}: Props): JSX.Element => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-term-panel px-4 py-3"
      key={id}
      id={id}
    >
      <Link
        to={`/company/${searchResult.symbol}/company-profile`}
        className="term-focus min-w-0 flex-1 truncate text-[13px] text-term-text hover:text-term-accent"
      >
        {searchResult.name}{" "}
        <span className="term-num text-[12px] text-term-dim">{searchResult.symbol}</span>
      </Link>
      <span className="term-label">{searchResult.currency}</span>
      <span className="term-label w-40 truncate" title={searchResult.stockExchange}>
        {searchResult.exchangeShortName}
      </span>
      <AddPortfolio
        onPortfolioCreate={onPortfolioCreate}
        symbol={searchResult.symbol}
      />
    </div>
  );
};

export default Card;
