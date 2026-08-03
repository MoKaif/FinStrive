import React from "react";
import { NavLink } from "react-router-dom";

type Props = {};

const groups = [
  {
    label: "Ledger",
    links: [{ to: "/transactions", label: "Transactions" }],
  },
  {
    label: "Fundamentals",
    links: [
      { to: "company-profile", label: "Profile" },
      { to: "income-statement", label: "Income statement" },
      { to: "balance-sheet", label: "Balance sheet" },
      { to: "cashflow-statement", label: "Cash flow" },
      { to: "historical-dividend", label: "Dividends" },
    ],
  },
];

// Active section is marked with an accent rule on the left edge, matching how
// the navbar marks the active tab. Icons are gone — the labels are the labels.
const item = ({ isActive }: { isActive: boolean }) =>
  [
    "block border-l py-1.5 pl-3 text-[12px] transition-colors",
    isActive
      ? "border-term-accent text-term-text"
      : "border-transparent text-term-muted hover:border-term-rule hover:text-term-text",
  ].join(" ");

const Sidebar = (props: Props) => {
  return (
    <nav className="absolute bottom-0 left-0 top-0 hidden w-56 border-r border-term-rule bg-term-panel px-4 pt-24 md:block">
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="term-label mb-2 pl-3">{group.label}</p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} className={item} end>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
