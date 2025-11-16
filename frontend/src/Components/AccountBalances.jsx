import { useState } from 'react';

function AccountBalances({ accounts }) {
  const [expandedAccounts, setExpandedAccounts] = useState(new Set(['Assets', 'Income', 'Expenses']));

  const formatAmount = (amount, currency = 'INR') => {
    if (amount === null || amount === undefined) return '-';
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };
  
  const getDisplayBalance = (accountPath, balance) => {
    if (balance === null || balance === undefined) return null;
    // Balances are already adjusted in backend for display
    return balance;
  };

  const toggleAccount = (fullPath) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(fullPath)) {
      newExpanded.delete(fullPath);
    } else {
      newExpanded.add(fullPath);
    }
    setExpandedAccounts(newExpanded);
  };

  const renderAccount = (account, level = 0) => {
    const isExpanded = expandedAccounts.has(account.full_path);
    const hasChildren = account.children && account.children.length > 0;
    const indent = level * 16;

    const getAmountColor = (accountPath, amount) => {
      if (!amount && amount !== 0) return 'text-gray-400';
      if (accountPath.startsWith('Income')) {
        return 'text-green-600 font-semibold';
      } else if (accountPath.startsWith('Expenses')) {
        return 'text-red-600 font-semibold';
      }
      return 'text-blue-600 font-semibold';
    };

    return (
      <div key={account.id} className="select-none">
        <div
          className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded cursor-pointer"
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => hasChildren && toggleAccount(account.full_path)}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {hasChildren && (
              <span className="text-gray-400 text-xs">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {!hasChildren && <span className="w-3"></span>}
            <span className="text-sm text-gray-700 truncate">{account.name}</span>
          </div>
          <span className={`text-sm ml-4 ${getAmountColor(account.full_path, account.balance)}`}>
            {formatAmount(getDisplayBalance(account.full_path, account.balance), account.currency)}
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {account.children.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h3>
        <p className="text-sm text-gray-500">No accounts found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h3>
      <div className="max-h-96 overflow-y-auto">
        {accounts.map((account) => renderAccount(account))}
      </div>
    </div>
  );
}

export default AccountBalances;

