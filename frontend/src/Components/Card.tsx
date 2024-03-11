import React from "react";
import "./Card.css";
import { CompanySearch } from "../company";

interface Props {
  id: string;
  searchResult: CompanySearch;
}

const Card: React.FC = ({}: Props) => {
  return (
    <div className="card">
      <div className="details">
        <h2>TCS</h2>
        <p>700Rs</p>
      </div>
      <p className="info">
        Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ab, nemo.
      </p>
    </div>
  );
};

export default Card;
