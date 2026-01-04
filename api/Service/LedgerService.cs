using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using api.Interfaces;
using api.Models;
using api.Data;

namespace api.Service
{
    public class LedgerService : ILedgerService
    {
        private readonly ITransactionRepository _transactionRepository;

        public LedgerService(ITransactionRepository transactionRepository)
        {
            _transactionRepository = transactionRepository;
        }

        public async Task<int> ImportLedgerFileAsync(string filePath)
        {
            Console.WriteLine($"ImportLedgerFileAsync called for {filePath}");
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"Ledger file not found at {filePath}");
            }

            var lines = await File.ReadAllLinesAsync(filePath);
            int importedCount = 0;

            // Regex for Header: YYYY-MM-DD (flag) Description
            var headerRegex = new Regex(@"^(\d{4}-\d{2}-\d{2})(?:\s+[*!])?\s+(.+)$");
            // Regex for Posting: (indent) Account (spaces) Amount?
            var postingRegex = new Regex(@"^\s+([\w:]+)(?:\s+(.*))?$");

            LedgerTransaction? currentTxn = null;

            foreach (var line in lines)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var trimmed = line.TrimStart();
                if (trimmed.StartsWith("alias") || trimmed.StartsWith(";")) continue;

                var headerMatch = headerRegex.Match(line);
                if (headerMatch.Success)
                {
                    // If we have a previous transaction accumulating, process it now
                    if (currentTxn != null)
                    {
                        await ProcessTransactionAsync(currentTxn);
                        importedCount++;
                    }

                    // Start new transaction
                    var dt = DateTime.Parse(headerMatch.Groups[1].Value);
                    dt = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                    var desc = headerMatch.Groups[2].Value.Trim();

                    currentTxn = new LedgerTransaction
                    {
                        Date = dt,
                        Description = desc,
                        Postings = new List<LedgerPosting>()
                    };
                    continue;
                }

                // If inside a transaction, look for postings
                if (currentTxn != null)
                {
                    var postingMatch = postingRegex.Match(line);
                    if (postingMatch.Success)
                    {
                        var account = postingMatch.Groups[1].Value;
                        decimal? amount = null;

                        var rest = postingMatch.Groups[2].Value.Trim();
                        if (!string.IsNullOrEmpty(rest))
                        {
                            // Try to parse amount. Regex to strip currency.
                            // Ledger format allows "Start" amount or "End" amount, but usually just amount.
                            // e.g. "₹25500" or "$ 10.00"
                            var amountStr = Regex.Replace(rest, @"[^\d.-]", "");
                            if (decimal.TryParse(amountStr, out decimal parsed))
                            {
                                amount = parsed;
                            }
                        }

                        currentTxn.Postings.Add(new LedgerPosting { Account = account, Amount = amount });
                    }
                }
            }

            // Process final transaction
            if (currentTxn != null)
            {
                await ProcessTransactionAsync(currentTxn);
                importedCount++;
            }
            
            Console.WriteLine($"Import complete. Count: {importedCount}");
            return importedCount;
        }

        private async Task ProcessTransactionAsync(LedgerTransaction txn)
        {
            if (txn.Postings.Count < 2)
            {
                Console.WriteLine($"Skipping txn {txn.Description}: Less than 2 postings.");
                return;
            }

            // 1. Balance Calculation (Handle implicit amounts)
            // Sum of known amounts
            decimal sum = txn.Postings.Where(p => p.Amount.HasValue).Sum(p => p.Amount!.Value);
            var nullAmountPostings = txn.Postings.Where(p => !p.Amount.HasValue).ToList();

            if (nullAmountPostings.Count == 1)
            {
                // Implicit amount is -sum
                nullAmountPostings[0].Amount = -sum;
            }
            else if (nullAmountPostings.Count > 1)
            {
                Console.WriteLine($"Skipping txn {txn.Description}: Multiple implicit amounts.");
                return;
            }
            // If No nulls, sum should be 0. If not, ledger is invalid, but we'll proceed processing knowns.

            // 2. Identify From/To
            // Simple heuristic: Negative is From (Source), Positive is To (Destination).
            // NOTE: A complex transaction might have multiple Froms or Tos.
            // For this MVP, we will try to create ONE Transaction entity representing the main flow.
            // Or if multiple flows, maybe multiple lines?
            // "The user wants to fix update account from and to... logic to derive expense category from Account string"
            
            // Let's assume the classic case: 1 Positive, 1 Negative.
            var from = txn.Postings.FirstOrDefault(p => p.Amount < 0);
            var to = txn.Postings.FirstOrDefault(p => p.Amount > 0);

            if (from == null || to == null)
            {
                // Weird transaction (zero amount? or only one side?)
                return;
            }

            // 3. Create Entity
            var transaction = new Transaction
            {
                TxnDate = txn.Date,
                DescriptionRaw = txn.Description,
                DescriptionClean = txn.Description,
                Amount = to.Amount!.Value, // Absolute value derived from the positive leg
                AccountFrom = from.Account,
                AccountTo = to.Account,
                Source = "ledger",
                Mapped = true,
                CreatedAt = DateTime.UtcNow
            };

            // 4. Derive Category
            // "Derive expense category from Account string"
            // Usually we care about the Expense or Income category.
            // If 'To' is Expenses:Food, Category = Food.
            // If 'From' is Income:Salary, Category = Salary.
            
            string relevantAccount = "";
            if (to.Account.StartsWith("Expenses", StringComparison.OrdinalIgnoreCase))
            {
                relevantAccount = to.Account;
            }
            else if (from.Account.StartsWith("Income", StringComparison.OrdinalIgnoreCase))
            {
                relevantAccount = from.Account;
            }
            else
            {
                // Transfer? Use the 'To' account concept?
                relevantAccount = to.Account; 
            }

            // Extract the leaf node of the account string
            // "Expenses:Food:Groceries" -> "Groceries"
            if (!string.IsNullOrEmpty(relevantAccount))
            {
                var parts = relevantAccount.Split(':');
                transaction.Category = parts.Last();
            }

            await _transactionRepository.CreateAsync(transaction);
        }

        private class LedgerTransaction
        {
            public DateTime Date { get; set; }
            public string Description { get; set; } = string.Empty;
            public List<LedgerPosting> Postings { get; set; } = new();
        }

        private class LedgerPosting
        {
            public string Account { get; set; } = string.Empty;
            public decimal? Amount { get; set; }
        }
    }
}
