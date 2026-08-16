using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using api.Models;

namespace api.Interfaces
{
    public enum TransactionHistoryOutcome
    {
        Imported,
        Replaced,
        DuplicateFile
    }

    public class TransactionHistoryResult
    {
        public TransactionHistoryOutcome Outcome { get; set; }
        public TransactionHistoryImport Import { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public string? Message { get; set; }
    }

    public interface ITransactionHistoryImportService
    {
        Task<TransactionHistoryResult> ImportAsync(
            Stream stream,
            string fileName,
            bool replaceExisting,
            CancellationToken cancellationToken = default);
    }
}
