using System.Collections.Generic;
using System.Threading.Tasks;
using api.Data;
using api.Interfaces;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Repository
{
    public class TransactionRepository : ITransactionRepository
    {
        private readonly FinanceDbContext _context;

        public TransactionRepository(FinanceDbContext context)
        {
            _context = context;
        }

        public async Task<List<Transaction>> GetAllAsync()
        {
            // By default, do not return transactions that have been intentionally skipped
            return await _context.Transactions
                .Where(t => !t.Skipped)
                .ToListAsync();
        }

        public async Task<Transaction?> GetByIdAsync(int id)
        {
            return await _context.Transactions.FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<Transaction> CreateAsync(Transaction transaction)
        {
            await _context.Transactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
            return transaction;
        }

        public async Task<bool> ExistsBySourceRefAsync(string source, string sourceRef)
        {
            return await _context.Transactions
                .AnyAsync(t => t.Source == source && t.SourceRef == sourceRef);
        }

        public async Task<List<Transaction>> GetByMappedStatusAsync(bool isMapped)
        {
            // Exclude skipped transactions from mapped/unmapped queries
            return await _context.Transactions
                .Where(t => t.Mapped == isMapped && !t.Skipped)
                .OrderByDescending(t => t.TxnDate)
                .ToListAsync();
        }

        public async Task<Transaction?> UpdateAsync(int id, Transaction transaction)
        {
            var existing = await _context.Transactions.FindAsync(id);
            if (existing == null) return null;

            existing.Category = transaction.Category;
            existing.DescriptionClean = transaction.DescriptionClean;
            existing.Mapped = transaction.Mapped;
            existing.AccountTo = transaction.AccountTo;
            existing.AccountFrom = transaction.AccountFrom;
            existing.Amount = transaction.Amount;
            existing.Skipped = transaction.Skipped;

            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Transactions.AnyAsync(s => s.Id == id);
        }

        public async Task<decimal> GetHDFCBankNetBalanceAsync()
        {
            // Calculate balance excluding internal transfers
            // Credits (to bank): +ABS(Amount)
            // Debits (from bank): -ABS(Amount)
            var balance = await _context.Transactions
                .Where(t => t.AccountFrom != t.AccountTo && !t.Skipped)  // Exclude internal transfers and skipped
                .SumAsync(t => 
                    t.AccountTo == "Assets:Banking:HDFCBank" 
                        ? System.Math.Abs(t.Amount)
                        : t.AccountFrom == "Assets:Banking:HDFCBank"
                            ? -System.Math.Abs(t.Amount)
                            : 0m
                );

            return balance;
        }
    }
}
