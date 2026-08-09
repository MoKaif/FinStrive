using System;
using System.Collections.Generic;
using api.Models;

namespace api.Dtos.Portfolio
{
    /// <summary>What the parser read out of a transaction-history workbook, before it is stored.</summary>
    public class ParsedTransactionHistory
    {
        public DateTime StatementDate { get; set; }
        public string? Period { get; set; }
        public string? InvestorName { get; set; }

        public List<InvestmentTransaction> Transactions { get; set; } = new();

        /// <summary>The "... Total" line each sheet ends with, used to check our own arithmetic.</summary>
        public Dictionary<AssetClass, decimal> SectionTotals { get; set; } = new();

        public List<string> Warnings { get; set; } = new();
    }
}
