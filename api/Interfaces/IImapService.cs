using System.Threading.Tasks;
using api.Dtos.Portfolio;

namespace api.Interfaces
{
    public interface IImapService
    {
        Task<EmailTransactionSyncResult> CheckEmailsAsync(int? lookbackDays = null);
    }
}
