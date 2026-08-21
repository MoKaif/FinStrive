using System;
using System.Collections.Generic;
using System.Linq;

namespace api.Helpers
{
    public static class TransactionReference
    {
        public static string Normalize(string reference)
        {
            var trimmed = reference.Trim();
            if (trimmed.Length == 0 || trimmed.Any(c => !char.IsDigit(c)))
            {
                return trimmed;
            }

            var normalized = trimmed.TrimStart('0');
            return normalized.Length == 0 ? "0" : normalized;
        }

        public static IReadOnlyCollection<string> Candidates(string reference)
        {
            var trimmed = reference.Trim();
            var normalized = Normalize(trimmed);
            var candidates = new HashSet<string>(StringComparer.Ordinal)
            {
                trimmed,
                normalized
            };

            if (normalized.All(char.IsDigit))
            {
                // HDFC statement PDFs commonly left-pad the 12-digit UPI reference
                // to 16 digits. Keep a small range so exports with a different fixed
                // width still match the canonical reference from the alert email.
                for (var width = normalized.Length; width <= 20; width++)
                {
                    candidates.Add(normalized.PadLeft(width, '0'));
                }
            }

            return candidates;
        }
    }
}
