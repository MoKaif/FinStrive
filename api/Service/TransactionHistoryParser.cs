using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using api.Dtos.Portfolio;
using api.Interfaces;
using api.Models;
using ExcelDataReader;

namespace api.Service
{
    /// <summary>
    /// Reads Value Research "Transaction History" workbooks.
    ///
    /// Unlike the holdings statement, which stacks every asset class on one sheet,
    /// this export puts each class on its own worksheet with its own column set —
    /// funds report NAV and units, stocks report price, quantity and brokerage, PPF
    /// reports only an amount and a running balance. Columns are therefore resolved
    /// by header text, and the asset class is taken from the sheet's banner with the
    /// worksheet name as a fallback.
    /// </summary>
    public class TransactionHistoryParser : ITransactionHistoryParser
    {
        private static readonly string[] DateFormats =
        {
            // Four-digit years first: "26" would otherwise be read as a day-month pair
            // by a looser format before the correct one is tried.
            "dd-MMM-yyyy", "d-MMM-yyyy", "dd-MMM-yy", "d-MMM-yy",
            "dd MMM yyyy", "dd-MM-yyyy", "yyyy-MM-dd"
        };

        private static readonly Regex AsOnRegex =
            new(@"TRANSACTION\s+HISTORY\s+AS\s+ON\s+(.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex PeriodRegex =
            new(@"^PERIOD:\s*(.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        static TransactionHistoryParser()
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        }

        public ParsedTransactionHistory Parse(Stream stream)
        {
            var sheets = ReadSheets(stream);
            if (sheets.Count == 0)
                throw new InvalidDataException("The workbook is empty.");

            var result = new ParsedTransactionHistory();
            var order = 0;

            foreach (var sheet in sheets)
                ReadSheet(sheet, result, ref order);

            if (result.StatementDate == default)
                throw new InvalidDataException(
                    "Could not find the export date. Expected a row reading " +
                    "\"TRANSACTION HISTORY as on <date>\".");

            if (result.Transactions.Count == 0)
                throw new InvalidDataException(
                    "No transactions were found. Upload the Value Research transaction " +
                    "history export, not the holdings statement.");

            CheckSectionTotals(result);
            return result;
        }

        // ---------------------------------------------------------------- reading

        private sealed class Sheet
        {
            public string Name { get; init; } = string.Empty;
            public List<object?[]> Rows { get; init; } = new();
        }

        private static List<Sheet> ReadSheets(Stream stream)
        {
            IExcelDataReader reader;
            try
            {
                reader = ExcelReaderFactory.CreateReader(stream);
            }
            catch (Exception ex)
            {
                throw new InvalidDataException(
                    "This file could not be opened as a spreadsheet. Upload the .xls " +
                    "transaction history exactly as Value Research exports it.", ex);
            }

            using (reader)
            {
                var sheets = new List<Sheet>();
                do
                {
                    var rows = new List<object?[]>();
                    while (reader.Read())
                    {
                        var row = new object?[reader.FieldCount];
                        for (var c = 0; c < reader.FieldCount; c++)
                            row[c] = reader.GetValue(c);
                        rows.Add(row);
                    }
                    sheets.Add(new Sheet { Name = reader.Name ?? string.Empty, Rows = rows });
                } while (reader.NextResult());

                return sheets;
            }
        }

        private static void ReadSheet(Sheet sheet, ParsedTransactionHistory result, ref int order)
        {
            var headerRow = -1;
            AssetClass? banner = null;

            for (var r = 0; r < sheet.Rows.Count; r++)
            {
                var first = Text(sheet.Rows[r], 0);
                if (first == null) continue;

                if (result.InvestorName == null && first.StartsWith("Name:", StringComparison.OrdinalIgnoreCase))
                {
                    result.InvestorName = first[5..].Trim();
                    continue;
                }

                var asOn = AsOnRegex.Match(first);
                if (result.StatementDate == default && asOn.Success)
                {
                    result.StatementDate = ParseDate(asOn.Groups[1].Value.Trim())
                        ?? throw new InvalidDataException(
                            $"Could not read the export date from \"{asOn.Groups[1].Value.Trim()}\".");
                    continue;
                }

                var period = PeriodRegex.Match(first);
                if (result.Period == null && period.Success)
                {
                    result.Period = period.Groups[1].Value.Trim();
                    continue;
                }

                banner ??= MatchSectionBanner(first);

                // The table starts at the row whose first cell is the date header.
                if (Normalize(first) == "transaction date")
                {
                    headerRow = r;
                    break;
                }
            }

            // A sheet with no table is a cover or notes page, not a failure.
            if (headerRow < 0) return;

            var assetClass = banner ?? MatchSectionBanner(sheet.Name);
            if (assetClass == null)
            {
                result.Warnings.Add(
                    $"Sheet \"{sheet.Name}\" has transactions but no recognised asset class, so it was skipped.");
                return;
            }

            var columns = MapColumns(sheet.Rows[headerRow]);
            ReadRows(sheet, headerRow + 1, assetClass.Value, columns, result, ref order);
        }

        private static void ReadRows(
            Sheet sheet,
            int start,
            AssetClass assetClass,
            IReadOnlyDictionary<Column, int> columns,
            ParsedTransactionHistory result,
            ref int order)
        {
            for (var r = start; r < sheet.Rows.Count; r++)
            {
                var row = sheet.Rows[r];
                if (IsBlank(row)) continue;

                // The total line puts its label in the date column, so it cannot be
                // confused with a data row, which always starts with a date.
                var first = Text(row, 0);
                if (first == null) continue;

                if (first.EndsWith("Total", StringComparison.OrdinalIgnoreCase))
                {
                    var total = Money(row, columns, Column.Amount);
                    if (total.HasValue) result.SectionTotals[assetClass] = total.Value;
                    return;
                }

                if (first.StartsWith("*")) return;

                var date = ParseDate(first);
                if (date == null)
                {
                    result.Warnings.Add(
                        $"{Label(assetClass)}: skipped a row whose date could not be read (\"{Truncate(first)}\").");
                    continue;
                }

                result.Transactions.Add(BuildTransaction(row, assetClass, columns, date.Value, order++));
            }
        }

        private static InvestmentTransaction BuildTransaction(
            object?[] row,
            AssetClass assetClass,
            IReadOnlyDictionary<Column, int> columns,
            DateTime date,
            int order)
        {
            var name = Text(row, columns, Column.Name) ?? "(unnamed)";
            var isin = Text(row, columns, Column.Isin);
            var type = Text(row, columns, Column.Type) ?? string.Empty;

            return new InvestmentTransaction
            {
                AssetClass = assetClass,
                RowOrder = order,
                TxnDate = date,
                InstrumentName = name,
                Isin = string.IsNullOrWhiteSpace(isin) ? null : isin.Trim().ToUpperInvariant(),
                Account = Account(row, columns, Column.Account),
                TransactionType = type,
                Kind = ClassifyKind(type),
                Amount = Money(row, columns, Column.Amount),
                Quantity = Money(row, columns, Column.Quantity),
                UnitPrice = Money(row, columns, Column.UnitPrice),
                Brokerage = Money(row, columns, Column.Brokerage),
                BalanceQuantity = Money(row, columns, Column.BalanceQuantity),
                MarketValue = Money(row, columns, Column.MarketValue),
                BalanceAmount = Money(row, columns, Column.BalanceAmount),
                GroupKey = HoldingsStatementParser.GroupKeyFor(assetClass, isin, name)
            };
        }

        /// <summary>
        /// Maps the export's wording onto what the transaction actually did. Matching
        /// is on substrings because the label differs per asset class for the same act.
        /// </summary>
        public static InvestmentTransactionKind ClassifyKind(string transactionType)
        {
            var text = Normalize(transactionType) ?? string.Empty;

            if (text.Contains("dividend") || text.Contains("payout")) return InvestmentTransactionKind.Dividend;
            if (text.Contains("interest")) return InvestmentTransactionKind.Interest;
            if (text.Contains("redemption") || text.Contains("redeem") || text.Contains("sell") ||
                text.Contains("sale") || text.Contains("switch out"))
                return InvestmentTransactionKind.Redemption;
            if (text.Contains("investment") || text.Contains("purchase") || text.Contains("buy") ||
                text.Contains("sip") || text.Contains("switch in"))
                return InvestmentTransactionKind.Investment;

            return InvestmentTransactionKind.Other;
        }

        /// <summary>
        /// Compares our own arithmetic against the total each sheet prints. The export
        /// totals the signed amounts, so dividends reduce the figure.
        /// </summary>
        private static void CheckSectionTotals(ParsedTransactionHistory result)
        {
            const decimal tolerance = 0.05m;

            foreach (var (assetClass, reported) in result.SectionTotals)
            {
                var computed = result.Transactions
                    .Where(t => t.AssetClass == assetClass)
                    .Sum(t => t.Amount ?? 0m);

                if (Math.Abs(computed - reported) > tolerance)
                {
                    result.Warnings.Add(
                        $"{Label(assetClass)}: the sheet totals {reported:N2} but its rows add up to " +
                        $"{computed:N2}, a difference of {Math.Abs(computed - reported):N2}.");
                }
            }

            var unknown = result.Transactions
                .Where(t => t.Kind == InvestmentTransactionKind.Other)
                .Select(t => t.TransactionType)
                .Distinct()
                .ToList();

            if (unknown.Count > 0)
            {
                result.Warnings.Add(
                    "Unrecognised transaction type(s), counted as neither cost nor payout: " +
                    string.Join(", ", unknown.Select(t => $"\"{t}\"")) + ".");
            }
        }

        private static AssetClass? MatchSectionBanner(string? text)
        {
            var key = Normalize(text)?.Replace(" / ", "/").Replace(" & ", " & ");
            return key switch
            {
                // Newer exports call this section "Mutual Funds / SIFs" in the
                // banner and "Mutual Funds & SIFs" in the worksheet tab.
                "mutual funds" or "mutual fund" or "mutual funds/sifs" or "mutual funds & sifs"
                    => AssetClass.MutualFund,
                "stocks & etfs" or "stocks and etfs" or "stocks &amp; etfs" or "equity & etfs"
                    => AssetClass.StockOrEtf,
                "reits/invits" or "reits & invits" or "reits and invits" or "reits &amp; invits"
                    => AssetClass.ReitInvit,
                "ppf" or "ppf investments" or "public provident fund" => AssetClass.Ppf,
                _ => null
            };
        }

        public static string Label(AssetClass assetClass) => assetClass switch
        {
            AssetClass.MutualFund => "Mutual Funds",
            AssetClass.StockOrEtf => "Stocks & ETFs",
            AssetClass.ReitInvit => "REITs & InvITs",
            AssetClass.Ppf => "PPF",
            _ => "Other"
        };

        // ---------------------------------------------------------------- columns

        private enum Column
        {
            Date, Name, Account, Type, Amount, Quantity, UnitPrice,
            Brokerage, BalanceQuantity, MarketValue, BalanceAmount, Isin
        }

        private static Dictionary<Column, int> MapColumns(object?[] header)
        {
            var map = new Dictionary<Column, int>();

            for (var c = 0; c < header.Length; c++)
            {
                var key = Normalize(Text(header, c))?.TrimEnd('*', ' ');
                if (string.IsNullOrEmpty(key)) continue;

                var column = key switch
                {
                    "transaction date" or "date" => Column.Date,
                    "scheme name" or "stock/etf name" or "reit/invit name" or "invit name"
                        or "ppf a/c name" or "name" => Column.Name,
                    "folio number" or "folio no" or "demat a/c" or "demat account" => Column.Account,
                    "transaction type" or "type" => Column.Type,
                    "amount" => Column.Amount,
                    "units" or "quantity" or "qty" => Column.Quantity,
                    "nav" or "price" or "market price" => Column.UnitPrice,
                    "brokerage" => Column.Brokerage,
                    "balance units" or "balance quantity" or "balance qty" => Column.BalanceQuantity,
                    "market value" or "current value" => Column.MarketValue,
                    "balance amount" or "balance" => Column.BalanceAmount,
                    "isin" => Column.Isin,
                    _ => (Column?)null
                };

                if (column.HasValue && !map.ContainsKey(column.Value))
                    map[column.Value] = c;
            }

            return map;
        }

        // ----------------------------------------------------------------- values

        private static DateTime? ParseDate(string raw)
        {
            if (DateTime.TryParseExact(raw, DateFormats, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var exact))
                return DateTime.SpecifyKind(exact.Date, DateTimeKind.Utc);

            return null;
        }

        private static string? Text(object?[] row, int index)
        {
            if (index < 0 || index >= row.Length) return null;
            var text = row[index]?.ToString()?.Trim();
            return string.IsNullOrEmpty(text) ? null : text;
        }

        private static string? Text(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column) =>
            columns.TryGetValue(column, out var i) ? Text(row, i) : null;

        /// <summary>Folio and demat numbers arrive as doubles; they are identifiers, not quantities.</summary>
        private static string? Account(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column)
        {
            if (!columns.TryGetValue(column, out var i) || i < 0 || i >= row.Length) return null;

            if (row[i] is double d && Math.Abs(d % 1) < double.Epsilon && Math.Abs(d) < 9.0e15)
                return ((long)d).ToString(CultureInfo.InvariantCulture);

            return Text(row, i);
        }

        private static decimal? Money(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column) =>
            columns.TryGetValue(column, out var i) ? ParseNumber(i < 0 || i >= row.Length ? null : row[i]) : null;

        /// <summary>
        /// Parses the numeric forms the export uses: native doubles, and strings
        /// carrying a rupee sign, Indian digit grouping, or the "--" placeholder that
        /// stands in for "not available".
        /// </summary>
        private static decimal? ParseNumber(object? value)
        {
            switch (value)
            {
                case null: return null;
                case double d: return double.IsNaN(d) || double.IsInfinity(d) ? null : (decimal)d;
                case decimal m: return m;
                case int i: return i;
                case long l: return l;
            }

            var text = value.ToString()?.Trim();
            if (string.IsNullOrEmpty(text)) return null;

            if (text is "--" or "-" or "—" or "N/A" or "NA" ||
                text.Equals("Not Applicable", StringComparison.OrdinalIgnoreCase))
                return null;

            var negative = text.StartsWith('(') && text.EndsWith(')');
            if (negative) text = text[1..^1];

            var cleaned = new StringBuilder(text.Length);
            foreach (var ch in text)
                if (char.IsDigit(ch) || ch == '.' || ch == '-' || ch == '+')
                    cleaned.Append(ch);

            if (cleaned.Length == 0) return null;
            if (!decimal.TryParse(cleaned.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
                return null;

            return negative ? -parsed : parsed;
        }

        // ------------------------------------------------------------------ misc

        private static bool IsBlank(object?[] row) =>
            row.All(cell => string.IsNullOrWhiteSpace(cell?.ToString()));

        private static string? Normalize(string? text) =>
            text == null ? null : Regex.Replace(text.Trim().ToLowerInvariant(), @"\s+", " ");

        private static string Truncate(string text) =>
            text.Length <= 40 ? text : text[..40] + "…";
    }
}
