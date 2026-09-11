import React from "react";
import { Link } from "react-router-dom";
import "./Hero.css";
import { BrandMark } from "../Brand/BrandMark";

interface Props {}

// What the app actually does, in the order you'd use it. The previous version
// advertised "20k+ users" and "$100M+ tracked" against a single-user ledger.
const modules = [
  {
    key: "01",
    title: "Transactions",
    body: "Import bank statement PDFs, sync from email, and post manual entries into one ledger.",
  },
  {
    key: "02",
    title: "Reconciliation",
    body: "Work through unmapped rows, assign accounts and categories, and skip what doesn't belong.",
  },
  {
    key: "03",
    title: "Portfolio",
    body: "Upload the monthly holdings statement. Folios are combined, cost corrections replayed, history kept.",
  },
];

const Hero = (props: Props) => {
  return (
    <section id="hero" className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-8 sm:pt-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-term-accent/[0.07] blur-[120px]" />
      <div className="mx-auto max-w-[88rem]">
        <div className="relative grid items-center gap-12 border-b border-term-rule pb-14 lg:grid-cols-[1fr_0.72fr] lg:gap-20">
          <div>
            <p className="term-label text-term-accent">Discipline compounds</p>
            <h1 className="mt-5 max-w-3xl font-display text-[42px] font-semibold leading-[1.03] tracking-[-0.035em] text-term-text sm:text-[64px] lg:text-[76px]">
              Clarity for every rupee.
            </h1>
            <p className="mt-6 max-w-xl text-[14px] leading-7 text-term-muted sm:text-[15px]">
              One intentional workspace for your bank ledger and investments—with the
              source, category, and calculation behind every number.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/register" className="term-btn-accent">
                Start building clarity
              </Link>
              <Link to="/login" className="term-btn">
                Sign in
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:mr-0">
            <div className="relative aspect-square border border-term-rule bg-term-panel/60 p-8 sm:p-12">
              <div className="absolute inset-6 rounded-full border border-term-rule/60" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-term-rule/50" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-term-rule/50" />
              <div className="relative flex h-full items-center justify-center rounded-[2.5rem] border border-term-rule bg-gradient-to-br from-term-raised to-term-ink shadow-2xl shadow-black/50">
                <BrandMark className="h-36 w-36 sm:h-44 sm:w-44" title="FinStrive folded S mark" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-px border-b border-term-rule bg-term-rule sm:grid-cols-3">
          {modules.map((module) => (
            <div key={module.key} className="bg-term-ink px-4 py-8 sm:px-5 lg:px-7">
              <span className="term-num text-[11px] text-term-accent">{module.key}</span>
              <h2 className="mt-3 text-[15px] font-semibold text-term-text">{module.title}</h2>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-term-muted">
                {module.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
