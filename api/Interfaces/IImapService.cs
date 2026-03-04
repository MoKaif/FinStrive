using System.Threading.Tasks;

namespace api.Interfaces
{
    public interface IImapService
    {
        Task CheckEmailsAsync();
    }
}
