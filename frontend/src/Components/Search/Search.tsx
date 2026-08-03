import React, { ChangeEvent, SyntheticEvent } from "react";

interface Props {
  onSearchSubmit: (e: SyntheticEvent) => void;
  search: string | undefined;
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const Search: React.FC<Props> = ({
  onSearchSubmit,
  search,
  handleSearchChange,
}: Props): JSX.Element => {
  return (
    <form className="flex flex-wrap items-center gap-3" onSubmit={onSearchSubmit}>
      <label htmlFor="search-input" className="sr-only">
        Search companies
      </label>
      <input
        className="term-input max-w-sm flex-1"
        id="search-input"
        placeholder="Ticker or company name"
        value={search}
        onChange={handleSearchChange}
      />
      <button type="submit" className="term-btn-accent">
        Search
      </button>
    </form>
  );
};

export default Search;
