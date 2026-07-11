using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Http;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using System.Linq;

namespace api.Service
{
    public class PdfService : IPdfService
    {
        private readonly ITransactionRepository _transactionRepository;

        public PdfService(ITransactionRepository transactionRepository)
        {
            _transactionRepository = transactionRepository;
        }

        public async Task<List<Transaction>> ImportPdfAsync(IFormFile file, string? password = null)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty");

            using (var stream = file.OpenReadStream())
            {
                return await ImportPdfAsync(stream, password);
            }
        }

        public async Task<List<Transaction>> ImportPdfAsync(Stream stream, string? password = null)
        {
            var importedTransactions = new List<Transaction>();
            var history = await _transactionRepository.GetByMappedStatusAsync(true);

            // simple learning: exact match on clean description
            var knowledgeBase = history
                .Where(t => !string.IsNullOrEmpty(t.DescriptionClean))
                .GroupBy(t => t.DescriptionClean!)
                .ToDictionary(g => g.Key, g => g.First());

            using (var memoryStream = new MemoryStream())
            {
                await stream.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                using (var document = PdfDocument.Open(memoryStream, new ParsingOptions { Password = password ?? "" }))
                {
                    foreach (var page in document.GetPages())
                    {
                        var words = page.GetWords()
                            .OrderBy(w => Math.Round(w.BoundingBox.Bottom, 1))
                            .ThenBy(w => w.BoundingBox.Left)
                            .ToList();

                        var rows = GroupWordsByRow(words);

                        foreach (var row in rows)
                        {
                            var parsed = ParseHdfcRow(row);
                            if (parsed != null)
                            {
                                if (parsed.SourceRef != null && await _transactionRepository.ExistsBySourceRefAsync(parsed.Source, parsed.SourceRef))
                                {
                                    continue;
                                }

                                // RULE BASED LEARNER APPLICATION
                                if (!string.IsNullOrEmpty(parsed.DescriptionClean) && knowledgeBase.TryGetValue(parsed.DescriptionClean, out var known))
                                {
                                    parsed.Category = known.Category;
                                    parsed.AccountFrom = known.AccountFrom;
                                    parsed.AccountTo = known.AccountTo;
                                    // We leave Mapped = false so user reviews it, but it's pre-filled.
                                }

                                await _transactionRepository.CreateAsync(parsed);
                                importedTransactions.Add(parsed);
                            }
                        }
                    }
                }
            }

            return importedTransactions;
        }


        private List<string> GroupWordsByRow(List<UglyToad.PdfPig.Content.Word> words)
        {
            var rows = new List<string>();
            if (words.Count == 0) return rows;

            var currentRow = new List<string>();
            double currentY = words[0].BoundingBox.Bottom;
            const double yTolerance = 2.0; // Words within 2 points are on same row

            foreach (var word in words)
            {
                var wordY = word.BoundingBox.Bottom;

                if (Math.Abs(wordY - currentY) > yTolerance)
                {
                    // New row detected
                    if (currentRow.Count > 0)
                    {
                        rows.Add(string.Join(" ", currentRow));
                        currentRow.Clear();
                    }
                    currentY = wordY;
                }

                currentRow.Add(word.Text);
            }

            // Don't forget the last row
            if (currentRow.Count > 0)
            {
                rows.Add(string.Join(" ", currentRow));
            }

            return rows;
        }

        private List<Transaction> ParsePageText(string text)
        {
            var transactions = new List<Transaction>();

            // HDFC-specific parser: Accumulate multi-line rows using date as anchor
            // Format: DD/MM/YY Narration... RefNo DD/MM/YY Withdrawal/Deposit Balance

            // CRITICAL FIX: Normalize flattened PDF text by injecting newlines before dates
            text = Regex.Replace(text, @"(?<!\d)(\d{2}/\d{2}/\d{2})", "\n$1");

            // Relaxed pattern - date doesn't need to be at line start
            var datePattern = new Regex(@"\d{2}/\d{2}/\d{2}");
            var lines = text.Split('\n');

            List<string> transactionRows = new List<string>();
            string? currentRow = null;

            // Step 1: Accumulate multi-line narrations into single rows
            foreach (var line in lines)
            {
                var clean = line.Trim();

                if (datePattern.IsMatch(clean))
                {
                    // New transaction row starts
                    if (currentRow != null)
                    {
                        transactionRows.Add(currentRow);
                    }
                    currentRow = clean;
                }
                else if (currentRow != null && !string.IsNullOrWhiteSpace(clean))
                {
                    // Continuation of narration
                    currentRow += " " + clean;
                }
            }

            // Don't forget the last row
            if (currentRow != null)
            {
                transactionRows.Add(currentRow);
            }

            // Step 2: Parse each accumulated row
            foreach (var row in transactionRows)
            {
                try
                {
                    var parsed = ParseHdfcRow(row);
                    if (parsed != null)
                    {
                        transactions.Add(parsed);
                    }
                }
                catch (Exception)
                {
                    // Silently skip unparseable rows
                }
            }

            return transactions;
        }

        private Transaction? ParseHdfcRow(string row)
        {
            // HDFC format: DD/MM/YY Narration... RefNo DD/MM/YY Amount Balance
            // Parse from right to left (most reliable)

            var tokens = row.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

            if (tokens.Length < 5)
            {
                return null;
            }

            try
            {
                // Right-to-left parsing
                var closingBalanceStr = tokens[^1].Replace(",", "");
                var amountStr = tokens[^2].Replace(",", "");
                var valueDateStr = tokens[^3];

                if (!decimal.TryParse(closingBalanceStr, out decimal closingBalance))
                {
                    return null;
                }

                if (!decimal.TryParse(amountStr, out decimal amount))
                {
                    return null;
                }

                if (!DateTime.TryParseExact(valueDateStr, "dd/MM/yy", null,
                    System.Globalization.DateTimeStyles.None, out DateTime valueDate))
                {
                    return null;
                }

                // Narration is everything between first date and last 3 tokens
                var narrationTokens = tokens.Skip(1).Take(tokens.Length - 4);
                var narration = string.Join(" ", narrationTokens).Trim();

                // Extract Reference Number from narration
                // HDFC reference numbers are typically 12 digits or more
                string sourceRef = "unknown_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                var refMatch = Regex.Match(narration, @"\d{12,}");
                if (refMatch.Success)
                {
                    sourceRef = refMatch.Value;
                }

                // Improved debit/credit detection
                // Most UPI/ATM/POS are debits, but check for salary/interest credits
                // Use case-insensitive comparison to handle varying text casing in PDFs
                var narratorUpper = narration.ToUpperInvariant();
                bool isCredit = narratorUpper.Contains("A2AINT") ||
                               narratorUpper.Contains("SALARY") ||
                               narratorUpper.Contains("INTEREST") ||
                               narratorUpper.Contains("REFUND");

                var transaction = new Transaction
                {
                    TxnDate = DateTime.SpecifyKind(valueDate, DateTimeKind.Utc),
                    DescriptionRaw = narration,
                    DescriptionClean = CleanNarration(narration),
                    Amount = amount,
                    Source = "pdf",
                    SourceRef = sourceRef,
                    Mapped = false,
                    ClosingBalance = closingBalance,
                    CreatedAt = DateTime.UtcNow
                };

                if (isCredit)
                {
                    transaction.AccountFrom = "Income:Unknown";
                    transaction.AccountTo = "Assets:Banking:HDFCBank";
                }
                else
                {
                    transaction.Amount = -Math.Abs(amount); // Ensure negative for debits
                    transaction.AccountFrom = "Assets:Banking:HDFCBank";
                    transaction.AccountTo = "Expenses:Uncategorized";
                }

                return transaction;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private string CleanNarration(string narration)
        {
            // Remove reference numbers and clean up HDFC-specific patterns
            var cleaned = Regex.Replace(narration, @"\d{12,}", ""); // Remove long ref numbers
            cleaned = Regex.Replace(cleaned, @"BIN\d+-\d+-\w+", ""); // Remove BIN references
            cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();
            return cleaned;
        }
    }
}
