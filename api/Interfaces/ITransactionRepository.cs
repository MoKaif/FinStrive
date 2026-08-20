using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using api.Models;

namespace api.Interfaces
{
    public interface ITransactionRepository
    {
        Task<List<Transaction>> GetAllAsync();
        Task<Transaction?> GetByIdAsync(int id);
        Task<Transaction> CreateAsync(Transaction transaction);
        Task<Transaction?> UpdateAsync(int id, Transaction transaction);
        Task<bool> ExistsBySourceRefAsync(string source, string sourceRef);
        Task<bool> ExistsByAnySourceRefAsync(IEnumerable<string> sourceRefs);
        Task<List<Transaction>> GetByDateAndAmountAsync(DateTime txnDate, decimal amount);
        Task<bool> ExistsAsync(int id);
        Task<List<Transaction>> GetByMappedStatusAsync(bool isMapped);
        Task<decimal> GetHDFCBankNetBalanceAsync();
    }
}
