import { useState, useEffect } from 'react';
import { getTransactions, getAccounts, getMonthlyAnalytics, getBankBalance } from '../services/api';
import TransactionList from './TransactionList';
import AccountBalances from './AccountBalances';
import MonthlyChart from './MonthlyChart';
import SearchFilter from './SearchFilter';

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [bankBalance, setBankBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [totalTransactions, setTotalTransactions] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsData, accountsData, monthlyData, bankBalanceData] = await Promise.all([
        getTransactions(filters),
        getAccounts(),
        getMonthlyAnalytics(),
        getBankBalance(),
      ]);

      setTransactions(transactionsData.transactions || []);
      setTotalTransactions(transactionsData.total || 0);
      setAccounts(accountsData || []);
      setMonthlyData(monthlyData || []);
      setBankBalance(bankBalanceData || null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">FinStrive Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">Your personal finance tracker</p>
            </div>
            {bankBalance && (
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Current Bank Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: bankBalance.currency || 'INR',
                    minimumFractionDigits: 2,
                  }).format(bankBalance.balance)}
                </p>
              </div>
            )}
          </div>
        </div>

        <SearchFilter onFilterChange={handleFilterChange} />

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <MonthlyChart data={monthlyData} />
              </div>
              <div>
                <AccountBalances accounts={accounts} />
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Transactions ({totalTransactions})
              </h2>
            </div>

            <TransactionList transactions={transactions} />
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

