using System;

namespace api.Models
{
    /// <summary>
    /// A standing correction to the invested amount a statement reports for an
    /// instrument. Value Research shows a zero cost basis for holdings it never
    /// saw a buy transaction for (IPO allotments, transfers-in), which inflates
    /// that row's return by its entire market value. Overrides are applied to
    /// every import, so a correction entered once holds for all future uploads.
    /// </summary>
    public class CostBasisOverride
    {
        public int Id { get; set; }

        public string Isin { get; set; } = string.Empty;

        /// <summary>Recorded for display only; matching is by ISIN.</summary>
        public string? InstrumentName { get; set; }

        /// <summary>The true amount invested, replacing whatever the statement reports.</summary>
        public decimal InvestedAmount { get; set; }

        public string? Reason { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
