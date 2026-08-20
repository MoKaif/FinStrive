using System;
using System.Globalization;
using System.Text.RegularExpressions;
using api.Helpers;
using api.Models;

namespace api.Service
{
    public class HdfcTransactionEmailParser
    {
        private static readonly Regex AmountPattern = new(
            @"Rs\.\s*(?<amount>[\d,]+(?:\.\d{1,2})?)\s+(?:has\s+been\s+successfully\s+credited|is\s+debited)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex ReferencePattern = new(
            @"(?:UPI\s+)?(?:transaction\s+)?reference\s+(?:no\.?|number)\s*:\s*(?<reference>\d+)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex SenderPattern = new(
            @"Sender\s*:\s*(?<sender>[^\r\n]+)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex UpiCounterpartyPattern = new(
            @"towards\s+VPA\s+(?<vpa>\S+)\s+\((?<name>[^)]+)\)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex CardMerchantPattern = new(
            @"Debit\s+Card\s+ending\s+\d+\s+at\s+(?<merchant>.+?)\s+on\s+\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Singleline);

        private static readonly string[] DateFormats =
        {
            "dd-MM-yy",
            "d-MM-yy",
            "dd MMM, yyyy",
            "d MMM, yyyy",
            "dd MMM yyyy",
            "d MMM yyyy"
        };

        public Transaction? Parse(string subject, string body, string? messageId = null)
        {
            if (string.IsNullOrWhiteSpace(body)) return null;

            var amountMatch = AmountPattern.Match(body);
            if (!amountMatch.Success ||
                !decimal.TryParse(
                    amountMatch.Groups["amount"].Value.Replace(",", ""),
                    NumberStyles.Number,
                    CultureInfo.InvariantCulture,
                    out var amount))
            {
                return null;
            }

            var amountSentence = amountMatch.Value;
            var isCredit = amountSentence.Contains("credited", StringComparison.OrdinalIgnoreCase);
            var isDebit = amountSentence.Contains("debited", StringComparison.OrdinalIgnoreCase);
            if (!isCredit && !isDebit) return null;

            var transactionDate = ParseDate(body);
            if (transactionDate == null) return null;

            var referenceMatch = ReferencePattern.Match(body);
            var sourceRef = referenceMatch.Success
                ? TransactionReference.Normalize(referenceMatch.Groups["reference"].Value)
                : BuildMessageReference(messageId);

            var counterparty = ExtractCounterparty(body, isCredit);
            var cleanDescription = string.IsNullOrWhiteSpace(counterparty)
                ? subject.Trim()
                : counterparty.Trim();

            return new Transaction
            {
                TxnDate = DateTime.SpecifyKind(transactionDate.Value.Date, DateTimeKind.Utc),
                DescriptionRaw = BuildRawDescription(isCredit, subject, cleanDescription),
                DescriptionClean = cleanDescription,
                Amount = isCredit ? Math.Abs(amount) : -Math.Abs(amount),
                AccountFrom = isCredit ? "Income:Unknown" : "Assets:Banking:HDFCBank",
                AccountTo = isCredit ? "Assets:Banking:HDFCBank" : "Expenses:Uncategorized",
                Category = null,
                Source = "email",
                SourceRef = sourceRef,
                Mapped = false,
                Skipped = false,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static DateTime? ParseDate(string body)
        {
            var candidates = new[]
            {
                Regex.Match(body, @"Date\s*:\s*(?<date>\d{1,2}-\d{2}-\d{2})", RegexOptions.IgnoreCase),
                Regex.Match(body, @"\bon\s+(?<date>\d{1,2}-\d{2}-\d{2})\b", RegexOptions.IgnoreCase),
                Regex.Match(body, @"\bon\s+(?<date>\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})\b", RegexOptions.IgnoreCase)
            };

            foreach (var candidate in candidates)
            {
                if (candidate.Success && DateTime.TryParseExact(
                    candidate.Groups["date"].Value,
                    DateFormats,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var parsed))
                {
                    return parsed;
                }
            }

            return null;
        }

        private static string ExtractCounterparty(string body, bool isCredit)
        {
            if (isCredit)
            {
                var sender = SenderPattern.Match(body);
                return sender.Success ? sender.Groups["sender"].Value.Trim() : string.Empty;
            }

            var upi = UpiCounterpartyPattern.Match(body);
            if (upi.Success)
            {
                return $"{upi.Groups["name"].Value.Trim()} ({upi.Groups["vpa"].Value.Trim()})";
            }

            var card = CardMerchantPattern.Match(body);
            return card.Success
                ? Regex.Replace(card.Groups["merchant"].Value, @"\s+", " ").Trim()
                : string.Empty;
        }

        private static string BuildRawDescription(bool isCredit, string subject, string counterparty)
        {
            var direction = isCredit ? "Credit from" : "Debit to";
            return string.IsNullOrWhiteSpace(counterparty)
                ? subject.Trim()
                : $"{direction} {counterparty}";
        }

        private static string? BuildMessageReference(string? messageId)
        {
            if (string.IsNullOrWhiteSpace(messageId)) return null;
            return $"email:{messageId.Trim().Trim('<', '>')}";
        }
    }
}
