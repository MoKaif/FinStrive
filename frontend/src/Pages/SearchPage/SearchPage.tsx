import React, { useState, ChangeEvent, SyntheticEvent, useEffect } from "react";
import { CompanySearch } from "../../company";
import { searchCompanies } from "../../api";
import Search from "../../Components/Search/Search";
import ListPortfolio from "../../Components/Portfolio/ListPortfolio/ListPortfolio";
import CardList from "../../Components/CardList/CardList";
import { PortfolioGet } from "../../Models/Portfolio";
import {
  portfolioAddAPI,
  portfolioDeleteAPI,
  portfolioGetAPI,
} from "../../Services/PortfolioService";
import { toast } from "react-toastify";

interface Props {}

const SearchPage = (props: Props) => {
  const [search, setSearch] = useState<string>("");
  const [portfolioValues, setPortfolioValues] = useState<PortfolioGet[] | null>(
    []
  );
  const [searchResult, setSearchResult] = useState<CompanySearch[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    getPortfolio();
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const getPortfolio = () => {
    portfolioGetAPI()
      .then((res) => {
        if (res?.data) {
          setPortfolioValues(res?.data);
        }
      })
      .catch((e) => {
        setPortfolioValues(null);
      });
  };

  const onPortfolioCreate = (e: any) => {
    e.preventDefault();
    portfolioAddAPI(e.target[0].value)
      .then((res) => {
        if (res?.status === 204) {
          toast.success("Stock added to portfolio!");
          getPortfolio();
        }
      })
      .catch((e) => {
        toast.warning("Could not add stock to portfolio!");
      });
  };

  const onPortfolioDelete = (e: any) => {
    e.preventDefault();
    portfolioDeleteAPI(e.target[0].value).then((res) => {
      if (res?.status == 200) {
        toast.success("Stock deleted from portfolio!");
        getPortfolio();
      }
    });
  };

  const onSearchSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const result = await searchCompanies(search);
    //setServerError(result.data);
    if (typeof result === "string") {
      setServerError(result);
    } else if (Array.isArray(result.data)) {
      setSearchResult(result.data);
    }
  };
  return (
    <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
      <div className="mx-auto max-w-[88rem] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-term-rule pb-4">
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight text-term-text">
              Stocks
            </h1>
            <p className="mt-2 text-[12px] text-term-muted">
              Company lookup and fundamentals. Coverage is US markets only — Indian
              holdings are tracked from the statement on the portfolio tab.
            </p>
          </div>
        </header>

        <Search
          onSearchSubmit={onSearchSubmit}
          search={search}
          handleSearchChange={handleSearchChange}
        />

        <ListPortfolio
          portfolioValues={portfolioValues!}
          onPortfolioDelete={onPortfolioDelete}
        />

        <CardList
          searchResults={searchResult}
          onPortfolioCreate={onPortfolioCreate}
        />

        {serverError && (
          <p className="text-[13px] text-term-loss">Could not reach the market data API.</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
