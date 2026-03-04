import React from "react";
import { Link } from "react-router-dom";
import { FaHome, FaTable, FaMoneyBill } from "react-icons/fa";
import { FaTableCells } from "react-icons/fa6";
import { SlGraph } from "react-icons/sl";

type Props = {};

const Sidebar = (props: Props) => {
  return (
    <nav className="block py-4 px-6 top-0 bottom-0 w-64 bg-background-card/95 border-r border-white/5 backdrop-blur-xl shadow-xl left-0 absolute flex-row flex-nowrap md:z-10 z-9999 transition-all duration-300 ease-in-out transform md:translate-x-0 -translate-x-full">
      <div className="flex-col min-h-full px-0 flex flex-wrap items-center justify-between w-full mx-auto overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col items-stretch opacity-100 relative mt-4 overflow-y-auto overflow-x-hidden h-auto z-40 items-center flex-1 rounded w-full">
          <div className="md:flex-col md:min-w-full flex flex-col list-none space-y-2">

            {/* Primary Features */}
            <div className="text-xs uppercase font-bold text-slate-500 mb-2 mt-4 px-2">Finance</div>
            <Link
              to="transactions"
              className="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <FaMoneyBill className="text-primary group-hover:text-primary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Transactions</h6>
            </Link>

            {/* Stock Features (Deprioritized) */}
            <div className="text-xs uppercase font-bold text-slate-500 mb-2 mt-6 px-2">Stocks</div>
            <Link
              to="company-profile"
              className="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <FaHome className="text-secondary group-hover:text-secondary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Company Profile</h6>
            </Link>
            <Link
              to="income-statement"
              className="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <FaTable className="text-secondary group-hover:text-secondary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Income Statement</h6>
            </Link>
            <Link
              to="balance-sheet"
              className="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <FaTableCells className="text-secondary group-hover:text-secondary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Balance Sheet</h6>
            </Link>
            <Link
              to="cashflow-statement"
              className="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <FaMoneyBill className="text-secondary group-hover:text-secondary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Cashflow Statement</h6>
            </Link>
            <Link
              to="historical-dividend"
              className="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
            >
              <SlGraph className="text-secondary group-hover:text-secondary-light transition-colors" />
              <h6 className="ml-3 font-medium text-sm">Historical Dividend</h6>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
