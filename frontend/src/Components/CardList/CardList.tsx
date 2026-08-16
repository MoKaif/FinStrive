import React, { SyntheticEvent } from "react";
import Card from "../Card/Card";
import { CompanySearch } from "../../company";
import { v4 as uuidv4 } from "uuid";

// Workaround for missing types if @types/uuid fails

interface Props {
  searchResults: CompanySearch[];
  onPortfolioCreate: (e: SyntheticEvent) => void;
}

const CardList: React.FC<Props> = ({
  searchResults,
  onPortfolioCreate,
}: Props): JSX.Element => {
  if (searchResults.length === 0) {
    return (
      <p className="term-panel px-4 py-10 text-center text-[13px] text-term-muted">
        No results.
      </p>
    );
  }

  return (
    <div className="space-y-px border border-term-rule bg-term-rule">
      {searchResults.map((result) => (
        <Card
          id={result.symbol}
          key={uuidv4()}
          searchResult={result}
          onPortfolioCreate={onPortfolioCreate}
        />
      ))}
    </div>
  );
};

export default CardList;
