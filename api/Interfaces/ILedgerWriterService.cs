using System.Threading.Tasks;
using api.Models;

namespace api.Interfaces
{
    public interface ILedgerWriterService
    {
        Task AppendToLedgerAsync(Transaction transaction);
    }
}
