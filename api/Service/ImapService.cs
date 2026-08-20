using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using api.Dtos.Portfolio;
using api.Helpers;
using api.Interfaces;
using api.Models;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace api.Service
{
    public class ImapService : IImapService
    {
        private readonly IConfiguration _config;
        private readonly ITransactionRepository _transactionRepository;
        private readonly HdfcTransactionEmailParser _parser;
        private readonly ILogger<ImapService> _logger;

        public ImapService(
            IConfiguration config,
            ITransactionRepository transactionRepository,
            HdfcTransactionEmailParser parser,
            ILogger<ImapService> logger)
        {
            _config = config;
            _transactionRepository = transactionRepository;
            _parser = parser;
            _logger = logger;
        }

        public async Task<EmailTransactionSyncResult> CheckEmailsAsync(int? lookbackDays = null)
        {
            var email = _config["GmailAddress"];
            var password = _config["GoogleAppKey"];

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("IMAP credentials are missing.");
            }

            var configuredLookback = _config.GetValue("TransactionEmailLookbackDays", 90);
            var effectiveLookback = Math.Clamp(lookbackDays ?? configuredLookback, 1, 90);
            var result = new EmailTransactionSyncResult();

            try
            {
                using var client = new ImapClient();
                await client.ConnectAsync("imap.gmail.com", 993, true);
                await client.AuthenticateAsync(email, password);

                var inbox = client.Inbox;
                await inbox.OpenAsync(FolderAccess.ReadOnly);

                var query = SearchQuery.And(
                    SearchQuery.DeliveredAfter(DateTime.UtcNow.AddDays(-effectiveLookback)),
                    SearchQuery.FromContains("hdfcbank"));

                var uids = await inbox.SearchAsync(query);
                result.Scanned = uids.Count;

                foreach (var uid in uids)
                {
                    var message = await inbox.GetMessageAsync(uid);
                    var body = GetReadableBody(message.TextBody, message.HtmlBody);
                    var transaction = _parser.Parse(message.Subject ?? string.Empty, body, message.MessageId);

                    if (transaction == null)
                    {
                        result.Ignored++;
                        continue;
                    }

                    result.Matched++;
                    if (await IsDuplicateAsync(transaction))
                    {
                        result.Duplicates++;
                        continue;
                    }

                    await _transactionRepository.CreateAsync(transaction);
                    result.Created++;
                }

                await client.DisconnectAsync(true);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to scan HDFC transaction emails");
                throw;
            }
        }

        private async Task<bool> IsDuplicateAsync(Transaction transaction)
        {
            var hasBankReference = !string.IsNullOrWhiteSpace(transaction.SourceRef) &&
                                   !transaction.SourceRef.StartsWith("email:", StringComparison.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(transaction.SourceRef) &&
                await _transactionRepository.ExistsByAnySourceRefAsync(
                    TransactionReference.Candidates(transaction.SourceRef)))
            {
                return true;
            }

            if (hasBankReference) return false;

            // Debit-card alerts do not include the bank transaction reference. Match
            // those against an existing statement row by date, amount and merchant.
            var sameAmountAndDate = await _transactionRepository.GetByDateAndAmountAsync(
                transaction.TxnDate,
                transaction.Amount);

            return sameAmountAndDate.Any(existing =>
                CounterpartiesOverlap(transaction.DescriptionClean, existing.DescriptionRaw) ||
                CounterpartiesOverlap(transaction.DescriptionClean, existing.DescriptionClean));
        }

        private static bool CounterpartiesOverlap(string? expected, string? candidate)
        {
            var expectedTokens = Tokens(expected);
            var candidateTokens = Tokens(candidate);
            if (expectedTokens.Count == 0 || candidateTokens.Count == 0) return false;

            return expectedTokens.Any(left => candidateTokens.Any(right =>
                left.Equals(right, StringComparison.OrdinalIgnoreCase) ||
                (left.Length >= 5 && right.Length >= 5 &&
                 (left.StartsWith(right, StringComparison.OrdinalIgnoreCase) ||
                  right.StartsWith(left, StringComparison.OrdinalIgnoreCase)))));
        }

        private static List<string> Tokens(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return new List<string>();

            return Regex.Split(value.ToUpperInvariant(), @"[^A-Z0-9]+")
                .Where(token => token.Length >= 4)
                .Where(token => token is not "DEBIT" and not "CREDIT" and not "FROM" and not "TRANSACTION")
                .Distinct()
                .ToList();
        }

        private static string GetReadableBody(string? textBody, string? htmlBody)
        {
            if (!string.IsNullOrWhiteSpace(textBody)) return textBody;
            if (string.IsNullOrWhiteSpace(htmlBody)) return string.Empty;

            var withoutTags = Regex.Replace(htmlBody, "<[^>]+>", " ");
            return WebUtility.HtmlDecode(Regex.Replace(withoutTags, @"\s+", " "));
        }
    }
}
