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
    /// Reads Value Research "Holdings Statement" workbooks.
    ///
    /// The layout is not a single table: the sheet stacks one block per asset class
    /// ("Mutual Funds", "Stocks &amp; ETFs", "REITs &amp; InvITs", "PPF"), each with its
    /// own banner row, its own column set, and a trailing "... Total" row, separated
    /// by blank spacer rows. Columns are therefore resolved by header text rather
    /// than by position, so a section gaining or reordering a column does not
    /// silently shift every value.
    /// </summary>
    public class HoldingsStatementParser : IHoldingsStatementParser
    {
        private static readonly string[] DateFormats =
        {
            "dd-MMM-yyyy", "d-MMM-yyyy", "dd-MMM-yy", "dd MMM yyyy", "dd-MM-yyyy", "yyyy-MM-dd"
        };

        private static readonly Regex StatementDateRegex =
            new(@"HOLDINGS\s+STATEMENT\s+AS\s+ON\s+(.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        static HoldingsStatementParser()
        {
            // Legacy BIFF workbooks are code-page encoded; without this the reader
            // cannot decode strings on .NET Core.
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        }

        public ParsedStatement Parse(Stream stream)
        {
            var grid = ReadGrid(stream);
            if (grid.Count == 0)
                throw new InvalidDataException("The workbook is empty.");

            var result = new ParsedStatement();

            ReadPreamble(grid, result);
            ReadSections(grid, result);

            if (result.Holdings.Count == 0)
                throw new InvalidDataException(
                    "No holdings were found. Expected a Value Research holdings statement with " +
                    "at least one of the sections: Mutual Funds, Stocks & ETFs, REITs & InvITs, PPF.");

            return result;
        }

        // ---------------------------------------------------------------- reading

        private static List<object?[]> ReadGrid(Stream stream)
        {
            IExcelDataReader reader;
            try
            {
                reader = ExcelReaderFactory.CreateReader(stream);
            }
            catch (Exception ex)
            {
                // Surfaced to the user, so say what to do rather than what threw.
                throw new InvalidDataException(
                    "This file could not be opened as a spreadsheet. Upload the .xls " +
                    "holdings statement exactly as Value Research exports it.", ex);
            }

            using (reader)
            {
                return ReadRows(reader);
            }
        }

        private static List<object?[]> ReadRows(IExcelDataReader reader)
        {
            var rows = new List<object?[]>();

            // Only the first worksheet is used; the export never contains more.
            while (reader.Read())
            {
                var row = new object?[reader.FieldCount];
                for (var c = 0; c < reader.FieldCount; c++)
                    row[c] = reader.GetValue(c);
                rows.Add(row);
            }

            return rows;
        }

        private static void ReadPreamble(List<object?[]> grid, ParsedStatement result)
        {
            for (var r = 0; r < grid.Count; r++)
            {
                var first = Text(grid[r], 0);
                if (first == null) continue;

                if (result.InvestorName == null && first.StartsWith("Name:", StringComparison.OrdinalIgnoreCase))
                {
                    result.InvestorName = first[5..].Trim();
                    continue;
                }

                var match = StatementDateRegex.Match(first);
                if (result.StatementDate == default && match.Success)
                {
                    result.StatementDate = ParseStatementDate(match.Groups[1].Value.Trim());
                    continue;
                }

                // The portfolio-level summary is a two-row block: labels then values.
                if (first.Equals("Total Invested Amount", StringComparison.OrdinalIgnoreCase))
                {
                    var values = NextNonEmptyRow(grid, r + 1);
                    if (values >= 0)
                    {
                        result.ReportedInvested = Money(grid[values], 0);
                        result.ReportedMarketValue = Money(grid[values], 1);
                        result.ReportedTotalReturn = Money(grid[values], 2);
                        result.ReportedReturnPct = Percent(grid[values], 3);
                    }
                }
            }

            if (result.StatementDate == default)
                throw new InvalidDataException(
                    "Could not find the statement date. Expected a row reading " +
                    "\"HOLDINGS STATEMENT as on <date>\".");
        }

        private static DateTime ParseStatementDate(string raw)
        {
            if (DateTime.TryParseExact(raw, DateFormats, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var exact))
                return DateTime.SpecifyKind(exact.Date, DateTimeKind.Utc);

            if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var loose))
                return DateTime.SpecifyKind(loose.Date, DateTimeKind.Utc);

            throw new InvalidDataException($"Could not read the statement date from \"{raw}\".");
        }

        // --------------------------------------------------------------- sections

        private static void ReadSections(List<object?[]> grid, ParsedStatement result)
        {
            var order = 0;

            for (var r = 0; r < grid.Count; r++)
            {
                var assetClass = MatchSectionBanner(Text(grid[r], 0));
                if (assetClass == null) continue;

                var headerRow = NextNonEmptyRow(grid, r + 1);
                if (headerRow < 0) continue;

                var columns = MapColumns(grid[headerRow]);

                // A banner is only genuine if the row beneath it is a real header.
                // This keeps a holding whose name happens to match a section label
                // from being mistaken for the start of a new block.
                if (!columns.ContainsKey(Column.Invested) || !columns.ContainsKey(Column.MarketValue))
                    continue;

                r = ReadSectionRows(grid, headerRow + 1, assetClass.Value, columns, result, ref order);
            }
        }

        /// <summary>Reads data rows until the section's total row, and returns the index to resume from.</summary>
        private static int ReadSectionRows(
            List<object?[]> grid,
            int start,
            AssetClass assetClass,
            IReadOnlyDictionary<Column, int> columns,
            ParsedStatement result,
            ref int order)
        {
            for (var r = start; r < grid.Count; r++)
            {
                if (IsBlank(grid[r])) continue;

                var name = Text(grid[r], columns.TryGetValue(Column.Name, out var nameCol) ? nameCol : 0);
                if (name == null) continue;

                // Every block is terminated by its own "... Total" line.
                if (name.EndsWith("Total", StringComparison.OrdinalIgnoreCase))
                {
                    result.SectionTotals[assetClass] = new SectionTotals
                    {
                        Invested = Money(grid[r], columns, Column.Invested),
                        MarketValue = Money(grid[r], columns, Column.MarketValue),
                        TotalReturn = Money(grid[r], columns, Column.TotalReturn),
                        PortfolioWeight = Percent(grid[r], columns, Column.Weight)
                    };
                    return r;
                }

                // The footnote that closes the sheet, and any stray banner, ends the block.
                if (name.StartsWith("*") || MatchSectionBanner(name) != null)
                    return r - 1;

                result.Holdings.Add(BuildHolding(grid[r], assetClass, columns, name, order++));
            }

            return grid.Count;
        }

        private static Holding BuildHolding(
            object?[] row,
            AssetClass assetClass,
            IReadOnlyDictionary<Column, int> columns,
            string name,
            int order)
        {
            var isin = Text(row, columns, Column.Isin);
            var invested = Money(row, columns, Column.Invested) ?? 0m;
            var totalReturn = Money(row, columns, Column.TotalReturn) ?? 0m;

            return new Holding
            {
                AssetClass = assetClass,
                RowOrder = order,
                Name = name,
                Isin = string.IsNullOrWhiteSpace(isin) ? null : isin.Trim().ToUpperInvariant(),
                Account = Account(row, columns, Column.Account),
                Category = Text(row, columns, Column.Category),
                Units = Money(row, columns, Column.Units),
                UnitPrice = Money(row, columns, Column.UnitPrice),
                InvestedReported = invested,
                Invested = invested,
                MarketValue = Money(row, columns, Column.MarketValue) ?? 0m,
                TotalReturnReported = totalReturn,
                TotalReturn = totalReturn,
                Xirr = Percent(row, columns, Column.Xirr),
                PortfolioWeightReported = Percent(row, columns, Column.Weight),
                GroupKey = GroupKeyFor(assetClass, isin, name)
            };
        }

        /// <summary>
        /// Identifies rows for the same instrument across folios. ISIN is preferred;
        /// PPF has none, so its name is used instead.
        /// </summary>
        public static string GroupKeyFor(AssetClass assetClass, string? isin, string name) =>
            !string.IsNullOrWhiteSpace(isin)
                ? isin.Trim().ToUpperInvariant()
                : $"{assetClass}:{Normalize(name)}";

        private static AssetClass? MatchSectionBanner(string? text) => Normalize(text) switch
        {
            "mutual funds" or "mutual fund" => AssetClass.MutualFund,
            "stocks & etfs" or "stocks and etfs" or "stocks &amp; etfs" or "equity & etfs" => AssetClass.StockOrEtf,
            "reits & invits" or "reits and invits" or "reits / invits" or "reits &amp; invits" => AssetClass.ReitInvit,
            "ppf" or "public provident fund" => AssetClass.Ppf,
            _ => null
        };

        // ---------------------------------------------------------------- columns

        private enum Column
        {
            Name, Account, Category, Units, Invested, MarketValue,
            Weight, TotalReturn, Xirr, UnitPrice, Isin
        }

        private static Dictionary<Column, int> MapColumns(object?[] header)
        {
            var map = new Dictionary<Column, int>();

            for (var c = 0; c < header.Length; c++)
            {
                // "Total Return*" carries a footnote marker in the header text.
                var key = Normalize(Text(header, c))?.TrimEnd('*', ' ');
                if (string.IsNullOrEmpty(key)) continue;

                var column = key switch
                {
                    "scheme name" or "stock/etf name" or "reit/invit name" or "invit name"
                        or "ppf a/c name" or "name" => Column.Name,
                    "folio number" or "folio no" or "demat a/c" or "demat account" => Column.Account,
                    "scheme category" or "sub-industry" or "sub industry" or "category" => Column.Category,
                    "units held" or "units" or "quantity" or "qty" => Column.Units,
                    "invested amount" or "invested" => Column.Invested,
                    "market value" or "current value" => Column.MarketValue,
                    "portfolio weight" or "weight" => Column.Weight,
                    "total return" => Column.TotalReturn,
                    "xirr" => Column.Xirr,
                    "nav" or "market price" or "price" => Column.UnitPrice,
                    "isin" => Column.Isin,
                    _ => (Column?)null
                };

                // First match wins, so a duplicated header cannot clobber the mapping.
                if (column.HasValue && !map.ContainsKey(column.Value))
                    map[column.Value] = c;
            }

            return map;
        }

        // ----------------------------------------------------------------- values

        private static string? Text(object?[] row, int index)
        {
            if (index < 0 || index >= row.Length) return null;
            var text = row[index]?.ToString()?.Trim();
            return string.IsNullOrEmpty(text) ? null : text;
        }

        private static string? Text(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column) =>
            columns.TryGetValue(column, out var i) ? Text(row, i) : null;

        /// <summary>
        /// Folio and demat numbers arrive as doubles when they are all digits. They
        /// are identifiers, so they must render as plain integers rather than in
        /// scientific notation or with a spurious decimal point.
        /// </summary>
        private static string? Account(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column)
        {
            if (!columns.TryGetValue(column, out var i) || i < 0 || i >= row.Length) return null;

            if (row[i] is double d && Math.Abs(d % 1) < double.Epsilon && Math.Abs(d) < 9.0e15)
                return ((long)d).ToString(CultureInfo.InvariantCulture);

            return Text(row, i);
        }

        private static decimal? Money(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column) =>
            columns.TryGetValue(column, out var i) ? Money(row, i) : null;

        private static decimal? Percent(object?[] row, IReadOnlyDictionary<Column, int> columns, Column column) =>
            columns.TryGetValue(column, out var i) ? Percent(row, i) : null;

        private static decimal? Money(object?[] row, int index) => ParseNumber(Value(row, index));

        private static decimal? Percent(object?[] row, int index)
        {
            var value = Value(row, index);
            // A percentage stored numerically is already in whole-percent units here
            // (the export writes "7.02%" as text), so no scaling is applied.
            return ParseNumber(value);
        }

        private static object? Value(object?[] row, int index) =>
            index < 0 || index >= row.Length ? null : row[index];

        /// <summary>
        /// Parses the numeric forms the export uses: native doubles, and strings
        /// carrying a rupee sign, Indian digit grouping, a percent sign, or the
        /// "--" placeholder that stands in for "not available".
        /// </summary>
        private static decimal? ParseNumber(object? value)
        {
            switch (value)
            {
                case null:
                    return null;
                case double d:
                    return double.IsNaN(d) || double.IsInfinity(d) ? null : (decimal)d;
                case decimal m:
                    return m;
                case int i:
                    return i;
                case long l:
                    return l;
            }

            var text = value.ToString()?.Trim();
            if (string.IsNullOrEmpty(text)) return null;

            // "--", "-", "NA" and "Not Applicable" all mean the statement has no figure.
            if (text is "--" or "-" or "—" or "N/A" or "NA" ||
                text.Equals("Not Applicable", StringComparison.OrdinalIgnoreCase))
                return null;

            var negative = text.StartsWith('(') && text.EndsWith(')');
            if (negative) text = text[1..^1];

            var cleaned = new StringBuilder(text.Length);
            foreach (var ch in text)
            {
                if (char.IsDigit(ch) || ch == '.' || ch == '-' || ch == '+')
                    cleaned.Append(ch);
                // Everything else - currency symbols, commas, %, spaces - is separator noise.
            }

            if (cleaned.Length == 0) return null;
            if (!decimal.TryParse(cleaned.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
                return null;

            return negative ? -parsed : parsed;
        }

        // ------------------------------------------------------------------ misc

        private static bool IsBlank(object?[] row) =>
            row.All(cell => string.IsNullOrWhiteSpace(cell?.ToString()));

        private static int NextNonEmptyRow(List<object?[]> grid, int from)
        {
            for (var r = from; r < grid.Count; r++)
                if (!IsBlank(grid[r])) return r;
            return -1;
        }

        private static string? Normalize(string? text) =>
            text == null ? null : Regex.Replace(text.Trim().ToLowerInvariant(), @"\s+", " ");
    }
}
