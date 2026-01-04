using System;

namespace api.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public DateTime TxnDate { get; set; }
        public string DescriptionRaw { get; set; } = string.Empty;
        public string? DescriptionClean { get; set; }
        public decimal Amount { get; set; }
        public string? AccountFrom { get; set; }
        public string? AccountTo { get; set; }
        public string? Category { get; set; }
        public string Source { get; set; } = string.Empty; // 'ledger' | 'pdf'
        public string? SourceRef { get; set; }
        public bool Mapped { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
