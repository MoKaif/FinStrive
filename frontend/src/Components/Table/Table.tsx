type Props = {
  config: any;
  data: any;
};

const Table = ({ config, data }: Props) => {
  const renderedRows = data.map((company: any) => {
    return (
      <tr key={company.cik} className="border-b border-term-rule/60 hover:bg-term-raised">
        {config.map((val: any) => {
          return (
            <td key={val.label} className="term-td term-num text-term-text">
              {val.render(company)}
            </td>
          );
        })}
      </tr>
    );
  });
  const renderedHeaders = config.map((config: any) => {
    return (
      <th className="term-th" key={config.label}>
        {config.label}
      </th>
    );
  });
  return (
    <div className="term-panel overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-term-rule bg-term-raised">{renderedHeaders}</tr>
        </thead>
        <tbody>{renderedRows}</tbody>
      </table>
    </div>
  );
};

export default Table;
