import React from "react";
import { Link } from "react-router-dom";
import hero from "./hero.png";
import "./Hero.css";

interface Props { }

const Hero = (props: Props) => {
  return (
    <section id="hero" className="relative pt-32 pb-20 min-h-screen overflow-hidden flex items-center">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-primary/20 blur-[120px] rounded-full sm:rotate-[15deg]"></div>

      <div className="container relative z-10 flex flex-col md:flex-row items-center px-6 mx-auto">
        {/* Left Content */}
        <div className="flex flex-col space-y-12 md:w-1/2 animate-slide-up">
          <div>
            <span className="px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary-light text-sm font-medium mb-6 inline-block backdrop-blur-md">
              Financial Freedom Starts Here
            </span>
            <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Smart Wealth
              </span> <br />
              Management.
            </h1>
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
              Track portfolios, reconcile transactions, and gain AI-powered insights into your financial health—all in one premium dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/register"
              className="py-4 px-8 text-lg font-bold text-white bg-gradient-to-r from-primary to-primary-light rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 text-center"
            >
              Start For Free
            </Link>
            <Link
              to="/login"
              className="py-4 px-8 text-lg font-bold text-slate-300 border border-white/10 rounded-xl hover:bg-white/5 transition-all duration-300 text-center"
            >
              Sign In
            </Link>
          </div>

          <div className="flex items-center gap-8 pt-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">20k+</span>
              <span className="text-sm text-slate-500">Users</span>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">$100M+</span>
              <span className="text-sm text-slate-500">Tracked</span>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="md:w-1/2 mt-16 md:mt-0 relative animate-fade-in flex justify-center" style={{ animationDelay: '0.2s' }}>
          <div className="relative z-10 p-4 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl shadow-primary/10 transform rotate-[-2deg] hover:rotate-0 transition-all duration-500 max-w-xs w-full">
            <img src={hero} alt="App Dashboard" className="rounded-[1.5rem] w-full h-auto shadow-lg" />
          </div>
          {/* Float Card 1 */}
          <div className="absolute -top-12 -right-8 p-4 bg-background-card border border-white/10 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '4s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                ↑
              </div>
              <div>
                <div className="text-xs text-slate-400">Portfolio</div>
                <div className="text-white font-bold">+24.5%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
