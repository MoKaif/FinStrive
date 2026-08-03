import React from "react";

type Props = {
  title: string;
  subTitle: string;
};

const Tile = ({ title, subTitle }: Props) => {
  return (
    <div className="bg-term-panel px-4 py-4">
      <h5 className="term-label">{title}</h5>
      <span className="mt-2 block text-[18px] leading-tight text-term-text">{subTitle}</span>
    </div>
  );
};

export default Tile;
