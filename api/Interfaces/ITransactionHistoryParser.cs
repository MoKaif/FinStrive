using System.IO;
using api.Dtos.Portfolio;

namespace api.Interfaces
{
    public interface ITransactionHistoryParser
    {
        ParsedTransactionHistory Parse(Stream stream);
    }
}
