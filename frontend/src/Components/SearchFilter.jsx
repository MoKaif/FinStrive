import { useState, useEffect } from 'react';
import { getAccounts, exportExcel, importLedger } from '../services/api';

function SearchFilter({ onFilterChange }) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountPath, setAccountPath] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accountsData = await getAccounts();
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const flattenAccounts = (accountList) => {
    let flat = [];
    for (const account of accountList) {
      flat.push({ ...account, full_path: account.full_path });
      if (account.children && account.children.length > 0) {
        flat = flat.concat(flattenAccounts(account.children));
      }
    }
    return flat;
  };

  const handleFilterChange = () => {
    const filters = {
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      account_path: accountPath || undefined,
    };
    onFilterChange(filters);
  };

  useEffect(() => {
    handleFilterChange();
  }, [search, startDate, endDate, accountPath]);

  const handleExport = async () => {
    try {
      await exportExcel({
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        account_path: accountPath || undefined,
      });
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await importLedger();
      alert(`Import successful! ${result.imported} transactions imported.`);
      window.location.reload();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error importing ledger. Please try again.');
    }
  };

  const allAccounts = flattenAccounts(accounts);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Payee or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="end_date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
            Account
          </label>
          <select
            id="account"
            value={accountPath}
            onChange={(e) => setAccountPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Accounts</option>
            {allAccounts.map((account) => (
              <option key={account.id} value={account.full_path}>
                {account.full_path}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex space-x-3">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Export to Excel
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Import Ledger
        </button>
        {(search || startDate || endDate || accountPath) && (
          <button
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setAccountPath('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchFilter;

