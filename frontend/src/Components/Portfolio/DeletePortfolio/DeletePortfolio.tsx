import React, { SyntheticEvent } from "react";

interface Props {
  onPortfolioDelete: (e: SyntheticEvent) => void;
  portfolioValue: string;
}

const DeletePortfolio = ({ onPortfolioDelete, portfolioValue }: Props) => {
  return (
    <form onSubmit={onPortfolioDelete}>
      <input hidden={true} readOnly={true} value={portfolioValue} />
      <button
        type="submit"
        aria-label={`Remove ${portfolioValue} from watchlist`}
        className="term-focus text-[11px] text-term-muted transition-colors hover:text-term-loss"
      >
        Remove
      </button>
    </form>
  );
};

export default DeletePortfolio;
