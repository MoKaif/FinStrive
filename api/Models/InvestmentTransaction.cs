using System;

namespace api.Models
{
    /// <summary>
    /// What a transaction did, independent of the wording Value Research uses.
    /// The label varies by asset class for the same act — a mutual fund says
    /// "SIP Investment", a stock says "Investment in stock", a REIT says
    /// "Purchase" — so downstream arithmetic keys off this instead.
    /// </summary>
    public enum InvestmentTransactionKind
    {
        /// <summary>Money going in: SIP, stock purchase, REIT purchase, PPF deposit.</summary>
        Investment = 0,

        /// <summary>A payout received. Reported with a negative amount.</summary>
        Dividend = 1,

        /// <summary>PPF interest credited. Carries no amount, only a new balance.</summary>
        Interest = 2,

        /// <summary>Units or shares sold.</summary>
        Redemption = 3,

        Other = 99
    }

    /// <summary>
    /// One line of a Value Research transaction history export.
    ///
    /// Figures are stored exactly as reported, including the negative amounts the
    /// export uses for dividends, so a row can always be traced back to the file.
    /// Interpretation belongs to <see cref="Kind"/> and to the timeline builder.
    /// </summary>
    public class InvestmentTransaction
    {
        public int Id { get; set; }

        public int ImportId { get; set; }
        public TransactionHistoryImport? Import { get; set; }

        public AssetClass AssetClass { get; set; }

        /// <summary>Order within the sheet, so the export's own sequence survives a round trip.</summary>
        public int RowOrder { get; set; }

        public DateTime TxnDate { get; set; }

        public string InstrumentName { get; set; } = string.Empty;

        /// <summary>Absent for PPF, which the export identifies by account name alone.</summary>
        public string? Isin { get; set; }

        /// <summary>Folio number, demat account, or PPF account name.</summary>
        public string? Account { get; set; }

        /// <summary>The export's own wording, kept for display and for spotting new types.</summary>
        public string TransactionType { get; set; } = string.Empty;

        public InvestmentTransactionKind Kind { get; set; }

        /// <summary>
        /// Null where the export reports "--": the Tata Capital IPO allotment, which
        /// has no cost basis, and PPF interest, which only moves the balance.
        /// </summary>
        public decimal? Amount { get; set; }

        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Brokerage { get; set; }

        /// <summary>Running holding after this transaction. Per folio, not per instrument.</summary>
        public decimal? BalanceQuantity { get; set; }

        /// <summary>Value of the whole position on this date, not of this transaction.</summary>
        public decimal? MarketValue { get; set; }

        /// <summary>PPF only: the account balance after this transaction.</summary>
        public decimal? BalanceAmount { get; set; }

        /// <summary>Ties folios of one instrument together. ISIN where there is one.</summary>
        public string GroupKey { get; set; } = string.Empty;

        /// <summary>
        /// Cost added by this row. Dividends and interest return cash rather than
        /// buying anything, so they contribute nothing; this is what reconciles with
        /// the statement's "Invested Amount".
        /// </summary>
        public decimal CostContribution =>
            Kind == InvestmentTransactionKind.Investment && Amount is > 0 ? Amount.Value : 0m;
    }
}
