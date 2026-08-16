import React from "react";
import Table from "../../Components/Table/Table";
import RatioList from "../../Components/RatioList/RatioList";
import { TestDataCompany } from "../../Components/Table/testData";

type Props = {};

const data = TestDataCompany;

const tableConfig = [
  {
    label: "symbol",
    render: (company: any) => company.symbol,
  },
];

const swatches = [
  { name: "ink", value: "#05070A", use: "Page" },
  { name: "panel", value: "#0C1015", use: "Block surface" },
  { name: "raised", value: "#11161D", use: "Header rows, hover" },
  { name: "rule", value: "#1C232B", use: "Hairlines" },
  { name: "text", value: "#E6E9EC", use: "Primary text" },
  { name: "muted", value: "#7E8994", use: "Secondary text" },
  { name: "dim", value: "#67727E", use: "Labels only" },
  { name: "accent", value: "#E8A33D", use: "Active state, primary action" },
  { name: "gain", value: "#46C68C", use: "Positive figures" },
  { name: "loss", value: "#E8635F", use: "Negative figures" },
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
          <h2 className="term-label mb-3">Palette</h2>
          <div className="grid gap-px border border-term-rule bg-term-rule sm:grid-cols-2 lg:grid-cols-5">
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
