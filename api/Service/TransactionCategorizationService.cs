using System.Text.RegularExpressions;
using api.Interfaces;
using api.Models;

namespace api.Service
{
    /// <summary>
    /// Suggests categories from previously reconciled merchants, then falls back
    /// to conservative merchant rules. Suggestions pre-fill pending rows; they do
    /// not mark a transaction as reconciled, so a person still confirms the entry.
    /// </summary>
    public class TransactionCategorizationService : ITransactionCategorizationService
    {
        private readonly ITransactionRepository _repository;
        private Task<List<Transaction>>? _history;

        private static readonly HashSet<string> NoiseTokens = new(StringComparer.OrdinalIgnoreCase)
        {
            "UPI", "POS", "VPA", "PAY", "PAYMENT", "DEBIT", "CREDIT", "TRANSFER",
            "TRANSACTION", "REF", "REFERENCE", "HDFC", "BANK", "BANKING", "PVT", "LTD",
            "INDIA", "TO", "FROM", "BY", "AT", "THE"
        };

        private static readonly (string Category, string[] Terms)[] Rules =
        {
            ("Food & Dining", new[] { "SWIGGY", "ZOMATO", "DOMINOS", "MCDONALD", "STARBUCKS", "RESTAURANT", "CAFE" }),
            ("Groceries", new[] { "BLINKIT", "ZEPTO", "BIGBASKET", "DMART", "GROCERY", "SUPERMARKET" }),
            ("Transport", new[] { "UBER", "OLA", "RAPIDO", "METRO", "IRCTC", "RAILWAY", "PETROL", "FUEL" }),
            ("Shopping", new[] { "AMAZON", "FLIPKART", "MYNTRA", "AJIO", "MEESHO" }),
            ("Bills & Utilities", new[] { "ELECTRICITY", "BROADBAND", "AIRTEL", "JIO", "VODAFONE", "UTILITY", "WATER BILL" }),
            ("Subscriptions", new[] { "NETFLIX", "SPOTIFY", "YOUTUBE", "HOTSTAR", "PRIME VIDEO", "APPLE.COM/BILL" }),
            ("Health", new[] { "PHARMACY", "MEDICAL", "HOSPITAL", "APOLLO", "PHARMEASY", "NETMEDS" }),
            ("Insurance", new[] { "INSURANCE", "LIC OF INDIA", "POLICY PREMIUM" }),
            ("Investment", new[] { "ZERODHA", "GROWW", "UPSTOX", "MUTUAL FUND", "SIP" }),
            ("Salary", new[] { "SALARY", "PAYROLL" }),
            ("Interest", new[] { "INTEREST CREDIT", "A2AINT" }),
            ("Refund", new[] { "REFUND", "REVERSAL", "CASHBACK" }),
        };

        public TransactionCategorizationService(ITransactionRepository repository)
        {
            _repository = repository;
        }

        public async Task<bool> ApplySuggestionAsync(Transaction transaction)
        {
            if (!NeedsSuggestion(transaction)) return false;

            _history ??= _repository.GetByMappedStatusAsync(true);
            var history = await _history;
            var known = FindHistoricalMatch(transaction, history);

            if (known != null && !string.IsNullOrWhiteSpace(known.Category))
            {
                Apply(transaction, known.Category!, known.AccountFrom, known.AccountTo);
                return true;
            }

            var ruleCategory = SuggestFromRules(transaction.DescriptionClean ?? transaction.DescriptionRaw);
            if (ruleCategory == null) return false;

            Apply(transaction, ruleCategory, null, null);
            return true;
        }

        public async Task<int> ApplySuggestionsToPendingAsync()
        {
            var pending = await _repository.GetByMappedStatusAsync(false);
            var count = 0;

            foreach (var transaction in pending)
            {
                if (!await ApplySuggestionAsync(transaction)) continue;
                await _repository.UpdateAsync(transaction.Id, transaction);
                count++;
            }

            return count;
        }

        public static string? SuggestFromRules(string? description)
        {
            if (string.IsNullOrWhiteSpace(description)) return null;
            var searchable = Regex.Replace(description.ToUpperInvariant(), @"\s+", " ");
            return Rules.FirstOrDefault(rule => rule.Terms.Any(searchable.Contains)).Category;
        }

        private static Transaction? FindHistoricalMatch(Transaction transaction, IEnumerable<Transaction> history)
        {
            var current = NormalizeDescription(transaction.DescriptionClean ?? transaction.DescriptionRaw);
            if (current.Length == 0) return null;

            var candidates = history
                .Where(t => !t.Skipped && !string.IsNullOrWhiteSpace(t.Category))
                .Select(t => new { Transaction = t, Key = NormalizeDescription(t.DescriptionClean ?? t.DescriptionRaw) })
                .Where(x => x.Key.Length > 0)
                .ToList();

            // Prefer the most frequently confirmed category for an exact merchant,
            // rather than whichever matching transaction happened to be returned first.
            var exact = candidates
                .Where(x => x.Key == current)
                .GroupBy(x => new { x.Transaction.Category, x.Transaction.AccountFrom, x.Transaction.AccountTo })
                .OrderByDescending(group => group.Count())
                .ThenByDescending(group => group.Max(x => x.Transaction.TxnDate))
                .FirstOrDefault();
            if (exact != null) return exact.OrderByDescending(x => x.Transaction.TxnDate).First().Transaction;

            var currentTokens = Tokens(current);
            if (currentTokens.Count == 0) return null;

            return candidates
                .Select(x => new { x.Transaction, Score = Similarity(currentTokens, Tokens(x.Key)) })
                .Where(x => x.Score >= 0.72)
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Transaction.TxnDate)
                .Select(x => x.Transaction)
                .FirstOrDefault();
        }

        public static string NormalizeDescription(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var tokens = Regex.Split(value.ToUpperInvariant(), @"[^A-Z0-9]+")
                .Where(token => token.Length >= 3 && !token.All(char.IsDigit) && !NoiseTokens.Contains(token));
            return string.Join(" ", tokens);
        }

        private static HashSet<string> Tokens(string value) =>
            value.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);

        private static double Similarity(HashSet<string> left, HashSet<string> right)
        {
            if (left.Count == 0 || right.Count == 0) return 0;
            var overlap = left.Intersect(right, StringComparer.OrdinalIgnoreCase).Count();
            return (2d * overlap) / (left.Count + right.Count);
        }

        private static bool NeedsSuggestion(Transaction transaction) =>
            string.IsNullOrWhiteSpace(transaction.Category) ||
            transaction.Category.Equals("Uncategorized", StringComparison.OrdinalIgnoreCase) ||
            transaction.Category.Equals("Unknown", StringComparison.OrdinalIgnoreCase);

        private static void Apply(Transaction transaction, string category, string? knownFrom, string? knownTo)
        {
            transaction.Category = category;
            var isCredit = transaction.Amount > 0 || transaction.AccountTo == "Assets:Banking:HDFCBank";

            if (isCredit)
            {
                transaction.AccountFrom = IsGeneric(transaction.AccountFrom) ? knownFrom ?? $"Income:{category}" : transaction.AccountFrom;
                transaction.AccountTo ??= knownTo ?? "Assets:Banking:HDFCBank";
            }
            else
            {
                transaction.AccountFrom ??= knownFrom ?? "Assets:Banking:HDFCBank";
                transaction.AccountTo = IsGeneric(transaction.AccountTo) ? knownTo ?? $"Expenses:{category}" : transaction.AccountTo;
            }
        }

        private static bool IsGeneric(string? account) =>
            string.IsNullOrWhiteSpace(account) ||
            account.EndsWith(":Unknown", StringComparison.OrdinalIgnoreCase) ||
            account.EndsWith(":Uncategorized", StringComparison.OrdinalIgnoreCase);
    }
}
