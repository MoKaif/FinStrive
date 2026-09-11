import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../../Context/useAuth";
import { BrandLockup } from "../Brand/BrandMark";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-term-rule bg-term-ink/95 backdrop-blur-md" aria-label="Primary navigation">
      <div className="mx-auto flex h-16 max-w-[88rem] items-stretch justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-stretch gap-10">
          <Link
            to="/"
            className="term-focus flex items-center py-2"
          >
            <BrandLockup compact />
            <span className="term-label ml-2 hidden text-term-accent sm:inline">v1.3</span>
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

        <div className="flex items-center gap-3">
          {isLoggedIn() ? (
            <>
              <span className="term-label hidden lg:inline">{user?.userName}</span>
              <button onClick={logout} className="term-btn hidden py-1.5 sm:inline-flex">
                Sign out
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="term-focus inline-flex h-10 w-10 items-center justify-center border border-term-rule text-term-muted lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              >
                <span className="sr-only">Menu</span>
                <span aria-hidden className="space-y-1">
                  <span className="block h-px w-4 bg-current" />
                  <span className="block h-px w-4 bg-current" />
                  <span className="block h-px w-4 bg-current" />
                </span>
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
      {isLoggedIn() && menuOpen && (
        <div id="mobile-navigation" className="border-t border-term-rule bg-term-panel px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-[88rem] gap-px bg-term-rule sm:grid-cols-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `term-focus bg-term-panel px-3 py-3 text-[12px] ${isActive ? "border-l-2 border-term-accent text-term-text" : "text-term-muted"}`}
              >
                {link.label}
              </NavLink>
            ))}
            <button onClick={logout} className="term-focus bg-term-panel px-3 py-3 text-left text-[12px] text-term-loss sm:hidden">
              Sign out · {user?.userName}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
