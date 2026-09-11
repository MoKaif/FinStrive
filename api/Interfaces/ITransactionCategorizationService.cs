using api.Models;

namespace api.Interfaces
{
    public interface ITransactionCategorizationService
    {
        Task<bool> ApplySuggestionAsync(Transaction transaction);
        Task<int> ApplySuggestionsToPendingAsync();
    }
}
