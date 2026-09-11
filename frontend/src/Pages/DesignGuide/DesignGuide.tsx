import React from "react";
import Table from "../../Components/Table/Table";
import RatioList from "../../Components/RatioList/RatioList";
import { TestDataCompany } from "../../Components/Table/testData";
import { BrandLockup, BrandMark } from "../../Components/Brand/BrandMark";

type Props = {};

const data = TestDataCompany;

const tableConfig = [
  {
    label: "symbol",
    render: (company: any) => company.symbol,
  },
];

const swatches = [
  { name: "accent", value: "#F59E0B", use: "Primary" },
  { name: "ink", value: "#0B0B0C", use: "Background" },
  { name: "raised", value: "#1F1F23", use: "Surface" },
  { name: "text", value: "#E5E7EB", use: "Text" },
  { name: "gain", value: "#10B981", use: "Positive" },
  { name: "loss", value: "#EF4444", use: "Negative" },
];

const DesignGuide = (props: Props) => {
  return (
    <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
      <div className="mx-auto max-w-[76rem] space-y-8">
        <header className="border-b border-term-rule pb-4">
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight">
            Design guide
          </h1>
          <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-term-muted">
            Flat surfaces, hairline rules and monospaced figures. Hierarchy comes from
            weight and separation rather than size, fill or shadow.
          </p>
        </header>

        <section>
          <h2 className="term-label mb-3">Brand system</h2>
          <div className="grid gap-px border border-term-rule bg-term-rule md:grid-cols-2">
            <div className="flex min-h-52 items-center justify-center bg-term-panel p-8">
              <BrandLockup />
            </div>
            <div className="grid min-h-52 grid-cols-2 gap-px bg-term-rule">
              <div className="flex items-center justify-center bg-term-ink p-8 text-term-text">
                <BrandMark monochrome className="h-20 w-20" title="Monochrome FinStrive mark" />
              </div>
              <div className="flex items-center justify-center bg-term-text p-8 text-term-ink">
                <BrandMark monochrome className="h-20 w-20" title="Reverse FinStrive mark" />
              </div>
            </div>
          </div>
          <div className="grid gap-px bg-term-rule sm:grid-cols-2">
            <div className="bg-term-panel px-4 py-4">
              <p className="term-label">Brand essence</p>
              <p className="mt-3 font-mono text-[12px] uppercase leading-7 tracking-[0.2em] text-term-text">
                Discipline · Clarity · Progress
              </p>
            </div>
            <div className="bg-term-panel px-4 py-4">
              <p className="term-label">Voice</p>
              <p className="mt-3 text-[13px] leading-relaxed text-term-muted">
                Precise, calm and intentional. Show the working; never overstate the result.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="term-label mb-3">Palette</h2>
          <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-6">
            {swatches.map((swatch) => (
              <div key={swatch.name} className="bg-term-panel px-3 py-3">
                <div className="h-8 w-full border border-term-rule" style={{ backgroundColor: swatch.value }} />
                <p className="mt-2 text-[12px] text-term-text">term-{swatch.name}</p>
                <p className="term-num text-[11px] text-term-dim">{swatch.value}</p>
                <p className="mt-1 text-[11px] text-term-muted">{swatch.use}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="term-label mb-3">Controls</h2>
          <div className="term-panel flex flex-wrap items-center gap-3 px-4 py-4">
            <button className="term-btn-accent">Primary action</button>
            <button className="term-btn">Secondary</button>
            <button className="term-btn-danger">Destructive</button>
            <button className="term-btn" disabled>
              Disabled
            </button>
            <input className="term-input w-48" placeholder="Text input" />
          </div>
        </section>

        <section>
          <h2 className="term-label mb-3">Key/value list</h2>
          <RatioList config={tableConfig} data={data} />
        </section>

        <section>
          <h2 className="term-label mb-3">Table</h2>
          <Table config={tableConfig} data={data} />
          <p className="mt-3 max-w-xl text-[12px] leading-relaxed text-term-muted">
            Table takes a config array and a data array. Each config entry supplies a
            label and a render function for one column.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DesignGuide;
