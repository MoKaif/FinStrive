import { format } from 'date-fns';

function TransactionList({ transactions }) {
  const formatAmount = (amount, currency = 'INR') => {
    if (!amount) return '-';
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getAmountColor = (accountPath) => {
    if (accountPath.startsWith('Income')) {
      return 'text-green-600 font-semibold';
    } else if (accountPath.startsWith('Expenses')) {
      return 'text-red-600 font-semibold';
    }
    return 'text-gray-700';
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.payee}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {transaction.postings && transaction.postings.length > 0 ? (
                      <div className="space-y-1">
                        {transaction.postings.map((posting, idx) => (
                          <div key={idx} className="text-xs text-gray-600">
                            {posting.account_path}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {transaction.postings && transaction.postings.length > 0 ? (
                    <div className="space-y-1">
                      {transaction.postings.map((posting, idx) => (
                        <div key={idx} className={getAmountColor(posting.account_path)}>
                          {formatAmount(posting.amount, posting.currency)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionList;

