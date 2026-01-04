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

        public ImportController(ILedgerService ledgerService)
        {
            _ledgerService = ledgerService;
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

    }
}
