using System.Collections.Generic;
using System.Threading.Tasks;
using api.Models;
using Microsoft.AspNetCore.Http;

namespace api.Interfaces
{
    public interface IPdfService
    {
        Task<List<Transaction>> ImportPdfAsync(IFormFile file, string? password = null);
        Task<List<Transaction>> ImportPdfAsync(Stream stream, string? password = null);
    }
}
