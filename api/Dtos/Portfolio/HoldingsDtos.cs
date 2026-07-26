using System;
using System.Collections.Generic;

namespace api.Dtos.Portfolio
{
    public class HoldingDto
    {
        public int Id { get; set; }
        public string AssetClass { get; set; } = string.Empty;
        public int RowOrder { get; set; }

        public string Name { get; set; } = string.Empty;
        public string? Isin { get; set; }
        public string? Account { get; set; }
        public string? Category { get; set; }

        /// <summary>Shared by every folio of the same instrument, so the UI can nest them.</summary>
        public string GroupKey { get; set; } = string.Empty;

        public decimal? Units { get; set; }
        public decimal? UnitPrice { get; set; }

        public decimal Invested { get; set; }
        public decimal InvestedReported { get; set; }
        public decimal MarketValue { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal TotalReturnReported { get; set; }

        /// <summary>Return over the adjusted cost basis, in percent.</summary>
        public decimal? ReturnPct { get; set; }
        public decimal? Xirr { get; set; }

        /// <summary>Share of the snapshot's market value, recomputed from counted rows.</summary>
        public decimal Weight { get; set; }
        public decimal? WeightReported { get; set; }

        public bool IsAggregate { get; set; }
        public bool ExcludedFromTotals { get; set; }
        public bool CostBasisAdjusted { get; set; }
        public bool IsEtf { get; set; }
        public string? AdjustmentNote { get; set; }

        // Movement since the previous statement; null when there is no prior snapshot.
        public bool IsNew { get; set; }
        public decimal? ChangeMarketValue { get; set; }
        public decimal? ChangeInvested { get; set; }
        public decimal? ChangeUnits { get; set; }
    }

    public class SectionDto
    {
        public string AssetClass { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Invested { get; set; }
        public decimal MarketValue { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal? ReturnPct { get; set; }
        public decimal Weight { get; set; }
        public decimal? ChangeMarketValue { get; set; }
        public List<HoldingDto> Holdings { get; set; } = new();
    }

    public class SnapshotSummaryDto
    {
        public int Id { get; set; }
        public DateTime StatementDate { get; set; }
        public DateTime UploadedAt { get; set; }
        public string SourceFileName { get; set; } = string.Empty;
        public decimal TotalInvested { get; set; }
        public decimal TotalMarketValue { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal ReturnPct { get; set; }
        public int HoldingsCount { get; set; }
        public int WarningsCount { get; set; }
    }

    public class SnapshotDetailDto : SnapshotSummaryDto
    {
        public string? InvestorName { get; set; }

        public decimal? ReportedInvested { get; set; }
        public decimal? ReportedMarketValue { get; set; }
        public decimal? ReportedTotalReturn { get; set; }
        public decimal? ReportedReturnPct { get; set; }

        public List<SectionDto> Sections { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public List<AdjustmentDto> Adjustments { get; set; } = new();

        /// <summary>The statement this one is compared against, if any.</summary>
        public SnapshotSummaryDto? PreviousSnapshot { get; set; }
        public decimal? ChangeMarketValue { get; set; }
        public decimal? ChangeInvested { get; set; }
    }

    /// <summary>A row the importer altered or excluded, surfaced so nothing is changed silently.</summary>
    public class AdjustmentDto
    {
        public string Kind { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Isin { get; set; }
        public string? Account { get; set; }
        public decimal? From { get; set; }
        public decimal? To { get; set; }
        public string? Note { get; set; }
    }

    public class HoldingHistoryPointDto
    {
        public int SnapshotId { get; set; }
        public DateTime StatementDate { get; set; }
        public decimal Invested { get; set; }
        public decimal MarketValue { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal? Units { get; set; }
        public decimal? UnitPrice { get; set; }
    }

    public class InstrumentHistoryDto
    {
        public string? Isin { get; set; }
        public string Name { get; set; } = string.Empty;
        public string AssetClass { get; set; } = string.Empty;
        public List<HoldingHistoryPointDto> Points { get; set; } = new();
    }

    public class CostBasisOverrideDto
    {
        public int Id { get; set; }
        public string Isin { get; set; } = string.Empty;
        public string? InstrumentName { get; set; }
        public decimal InvestedAmount { get; set; }
        public string? Reason { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveCostBasisOverrideDto
    {
        public string Isin { get; set; } = string.Empty;
        public string? InstrumentName { get; set; }
        public decimal InvestedAmount { get; set; }
        public string? Reason { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
