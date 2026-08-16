import React from "react";
import { Outlet } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  ticker: string;
}

const CompanyDashboard = ({ children, ticker }: Props) => {
  return (
    <div className="relative w-full bg-term-ink px-4 pb-16 pt-24 sm:px-8 md:ml-56">
      <div className="max-w-[76rem] space-y-5">
        <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
        <div className="space-y-5">
          <Outlet context={ticker} />
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
