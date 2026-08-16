type Props = {
  config: any;
  data: any;
};

const RatioList = ({ config, data }: Props) => {
  const renderedCells = config.map((row: any) => {
    return (
      <li key={row.label} className="flex items-baseline gap-6 border-b border-term-rule/60 px-4 py-3 last:border-b-0">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-term-text">{row.label}</p>
          {/* The subtitle used to be wrapped in a Cloudflare email-obfuscation
              anchor carried over from a scraped template — it linked nowhere. */}
          {row.subTitle && (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-term-muted">{row.subTitle}</p>
          )}
        </div>
        <div className="term-num shrink-0 text-[13px] text-term-text">{row.render(data)}</div>
      </li>
    );
  });

  return (
    <div className="term-panel w-full">
      <ul>{renderedCells}</ul>
    </div>
  );
};

export default RatioList;
