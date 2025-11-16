import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow">
          <p className="text-sm font-medium text-gray-900 mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => {
              if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
              if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
              return `₹${value}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
          <Bar dataKey="net" fill="#3b82f6" name="Net" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyChart;

