import React from "react";
import Card from "./Card";
import { CompanySearch } from "../company";
import { v4 as uuidv4 } from "uuid";
interface Props {
  searchResults: CompanySearch[];
}

const CardList = (props: Props) => {
  return (
    <>
      {searchResults.length > 0 ? (
        searchResults.map((result) => {
          return <Card id={result.symbol} key={uuidv4()} searchResult={result}/>;
        })
      ) : (
        <h1> No results </h1>
      )}
    </>
  );
};
