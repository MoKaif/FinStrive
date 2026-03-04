using System;
using System.Threading.Tasks;
using api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [Route("api/import")]
    [ApiController]
    public class ImportController : ControllerBase
    {
        private readonly ILedgerService _ledgerService;
        private readonly IPdfService _pdfService;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;

        public ImportController(ILedgerService ledgerService, IPdfService pdfService, Microsoft.Extensions.Configuration.IConfiguration config)
        {
            _ledgerService = ledgerService;
            _pdfService = pdfService;
            _config = config;
        }

        [HttpPost("ledger")]
        public async Task<IActionResult> ImportLedger()
        {
            try
            {
                // Hardcoded path as per instructions
                var path = "/home/nox/Nox/Finance/transactions.ledger";
                var count = await _ledgerService.ImportLedgerFileAsync(path);
                return Ok(new { message = "Import successful", count = count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("pdf")]
        public async Task<IActionResult> ImportPdf(IFormFile file)
        {
            try
            {
                var password = _config["CustomerID"];
                var transactions = await _pdfService.ImportPdfAsync(file, password);
                return Ok(new { message = "Import successful", count = transactions.Count, transactions = transactions });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
