using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using api.Models;

namespace api.Interfaces
{
    public enum ImportOutcome
    {
        Imported,
        Replaced,
        /// <summary>The exact same file has already been imported; nothing changed.</summary>
        DuplicateFile,
        /// <summary>A different file for the same statement date exists; caller must confirm a replace.</summary>
        DateConflict
    }

    public class HoldingsImportResult
    {
        public ImportOutcome Outcome { get; set; }
        public HoldingsSnapshot? Snapshot { get; set; }
        public List<string> Warnings { get; set; } = new();
        public string? Message { get; set; }

        public bool Succeeded => Outcome is ImportOutcome.Imported or ImportOutcome.Replaced;
    }

    public interface IHoldingsImportService
    {
        /// <summary>
        /// Parses, normalizes and persists a holdings statement. Re-importing an
        /// identical file is a no-op; importing a different file for an already
        /// imported statement date requires <paramref name="replaceExisting"/>.
        /// </summary>
        Task<HoldingsImportResult> ImportAsync(
            Stream stream,
            string fileName,
            bool replaceExisting,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Re-applies the current cost-basis overrides to every stored snapshot.
        /// Used after an override is added or edited so history stays consistent.
        /// </summary>
        Task<int> ReapplyOverridesAsync(CancellationToken cancellationToken = default);
    }
}
