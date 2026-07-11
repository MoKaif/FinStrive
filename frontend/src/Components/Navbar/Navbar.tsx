import React from "react";
import { Link } from "react-router-dom";
import logo from "./logo.png";
import "./Navbar.css";
import { useAuth } from "../../Context/useAuth";

interface Props { }

const Navbar = (props: Props) => {
  const { isLoggedIn, user, logout } = useAuth();
  return (
    <nav className="fixed w-full z-50 transition-all duration-300 border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <Link to="/" className="flex items-center space-x-3 group">
              {/* <img src={logo} alt="FinStrive Logo" className="w-10 h-10 object-contain" /> */}
              <span className="text-2xl font-display font-bold text-white tracking-tight">FinStrive.</span>
            </Link>

            {isLoggedIn() && (
              <div className="hidden lg:flex items-center space-x-8">
                <Link to="/transactions" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
                  Transactions
                </Link>
                <Link to="/reconciliation" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
                  Reconciliation
                </Link>
                    <Link to="/portfolio" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
                      Portfolio
                    </Link>
                {/* Deprioritized Stock Links */}
                <Link to="/search" className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors duration-200">
                  Stocks
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {isLoggedIn() ? (
              <>
                <div className="hidden lg:block text-slate-300 text-sm">
                  <span className="text-slate-500">Welcome,</span> {user?.userName}
                </div>
                <button
                  onClick={logout}
                  className="px-5 py-2 text-sm font-medium text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary to-primary-light hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
