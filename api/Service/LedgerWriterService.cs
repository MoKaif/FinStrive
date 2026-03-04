using System;
using System.IO;
using System.Threading.Tasks;
using api.Interfaces;
using api.Models;
using Microsoft.Extensions.Configuration;

namespace api.Service
{
    public class LedgerWriterService : ILedgerWriterService
    {
        private readonly string _ledgerBasePath;

        public LedgerWriterService(IConfiguration config)
        {
            _ledgerBasePath = config["LedgerPath"] ?? "/home/nox/Nox/Finance";
        }

        public async Task AppendToLedgerAsync(Transaction transaction)
        {
            // 1. Validation
            if (!transaction.Mapped) return; // Only mapped transactions
            if (transaction.TxnDate.Year == 2025) return; // CONSTRAINT: Do not touch 2025 files

            // 2. Determine File Path
            var targetFile = GetLedgerFilePath(transaction.TxnDate);

            // 3. Format Entry
            var entry = FormatLedgerEntry(transaction);

            // 4. Idempotency Check (Simple string check in file)
            // Note: This is a basic check. For production, better ID tracking is needed.
            // But strict string matching works for checking if we already wrote THIS exact entry.
            if (await FileContainsEntryAsync(targetFile, entry))
            {
                return; // Already exists
            }

            // 5. Append
            if (!Directory.Exists(_ledgerBasePath))
            {
                Directory.CreateDirectory(_ledgerBasePath);
            }
            await File.AppendAllTextAsync(targetFile, "\n" + entry);
        }

        private string GetLedgerFilePath(DateTime date)
        {
            // naming convention: YYYY-MM.ledger
            var filename = $"{date:yyyy-MM}.ledger";
            return Path.Combine(_ledgerBasePath, filename);
        }

        private string FormatLedgerEntry(Transaction t)
        {
            // Desired User Format:
            // YYYY-MM-DD Description
            //     AccountTo ₹Amount
            //     AccountFrom

            var dateStr = t.TxnDate.ToString("yyyy-MM-dd");
            var desc = (t.DescriptionClean ?? t.DescriptionRaw).Trim();

            // Format amount as ₹X (prefixed, no trailing decimals if whole number)
            string amountStr;
            decimal absAmount = Math.Abs(t.Amount);
            if (absAmount % 1 == 0)
                amountStr = $"₹{absAmount:0}";
            else
                amountStr = $"₹{absAmount:0.00}";

            var toAccount = t.AccountTo;
            var fromAccount = t.AccountFrom;

            // We use 2 spaces between account and amount as it's the standard for hledger/ledger
            // to support account names with spaces (though not present here, it's safer).
            // User example shows single space, but typically hledger requires 2+.
            // If the user strictly wants 1, we can adjust, but 2 is the most compatible.
            return $"{dateStr} {desc}\n    {toAccount}  {amountStr}\n    {fromAccount}\n";
        }

        private async Task<bool> FileContainsEntryAsync(string path, string entry)
        {
            if (!File.Exists(path)) return false;

            // Read file content
            // NOTE: For very large files, reading all text is bad. 
            // But ledger files are typically monthly and small (<1MB).
            var content = await File.ReadAllTextAsync(path);
            return content.Contains(entry.Trim());
        }
    }
}
