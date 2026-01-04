using System.Threading.Tasks;

namespace api.Interfaces
{
    public interface ILedgerService
    {
        Task<int> ImportLedgerFileAsync(string filePath);
    }
}
