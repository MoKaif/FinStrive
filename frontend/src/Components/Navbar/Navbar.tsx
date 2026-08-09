import React from "react";
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../../Context/useAuth";

interface Props {}

const links = [
  { to: "/transactions", label: "Transactions" },
  { to: "/reconciliation", label: "Reconciliation" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/search", label: "Stocks" },
];

// The active tab is marked by a rule sitting on the navbar's own bottom border,
// which is how the rest of the app separates things — no pill, no fill.
const tab = ({ isActive }: { isActive: boolean }) =>
  [
    "relative -mb-px border-b py-3 text-[12px] transition-colors",
    isActive
      ? "border-term-accent text-term-text"
      : "border-transparent text-term-muted hover:text-term-text",
  ].join(" ");

const Navbar = (props: Props) => {
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <nav className="fixed z-50 w-full border-b border-term-rule bg-term-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[88rem] items-stretch justify-between gap-8 px-4 sm:px-8">
        <div className="flex items-stretch gap-10">
          <Link
            to="/"
            className="term-focus flex items-center gap-2 py-3 text-[15px] font-semibold tracking-tight text-term-text"
          >
            FinStrive
            <span className="term-label text-term-accent">v1.3</span>
          </Link>

          {isLoggedIn() && (
            <div className="hidden items-stretch gap-7 lg:flex">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={tab}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn() ? (
            <>
              <span className="term-label hidden lg:inline">{user?.userName}</span>
              <button onClick={logout} className="term-btn py-1.5">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="term-focus text-[12px] text-term-muted hover:text-term-text">
                Sign in
              </Link>
              <Link to="/register" className="term-btn py-1.5">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
