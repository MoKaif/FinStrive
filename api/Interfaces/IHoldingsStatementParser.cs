using System.IO;
using api.Dtos.Portfolio;

namespace api.Interfaces
{
    public interface IHoldingsStatementParser
    {
        /// <summary>
        /// Reads a Value Research holdings statement (.xls/.xlsx) into its
        /// constituent positions. Throws InvalidDataException when the file does
        /// not look like a holdings statement.
        /// </summary>
        ParsedStatement Parse(Stream stream);
    }
}
