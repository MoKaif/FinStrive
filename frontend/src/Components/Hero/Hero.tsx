import React from "react";
import { Link } from "react-router-dom";
import "./Hero.css";

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
    <section id="hero" className="min-h-screen px-4 pb-20 pt-32 sm:px-8">
      <div className="mx-auto max-w-[88rem]">
        <div className="border-b border-term-rule pb-10">
          <p className="term-label">Personal finance ledger</p>
          <h1 className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-term-text sm:text-[56px]">
            Every rupee accounted for.
          </h1>
          <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-term-muted">
            FinStrive keeps your bank ledger and your investments in the same place, and
            shows the working behind every figure it reports.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login" className="term-btn-accent">
              Sign in
            </Link>
            <Link to="/register" className="term-btn">
              Create account
            </Link>
          </div>
        </div>

        <div className="grid gap-px border-b border-term-rule bg-term-rule md:grid-cols-3">
          {modules.map((module) => (
            <div key={module.key} className="bg-term-ink px-1 py-8 md:px-6">
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
