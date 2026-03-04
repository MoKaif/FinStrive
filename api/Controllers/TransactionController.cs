using System.Threading.Tasks;
using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [Route("api/transactions")]
    [ApiController]
    public class TransactionController : ControllerBase
    {
        private readonly ITransactionRepository _repo;
        private readonly ILedgerWriterService _ledgerWriter;
        private readonly IImapService _imapService;

        public TransactionController(ITransactionRepository repo, ILedgerWriterService ledgerWriter, IImapService imapService)
        {
            _repo = repo;
            _ledgerWriter = ledgerWriter;
            _imapService = imapService;
        }

        [HttpPost("sync-imap")]
        public async Task<IActionResult> SyncImap()
        {
            await _imapService.CheckEmailsAsync();
            return Ok("Sync initiated check logs.");
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool? mapped = null)
        {
            if (mapped.HasValue)
            {
                var filteredTxns = await _repo.GetByMappedStatusAsync(mapped.Value);
                return Ok(filteredTxns);
            }

            var txns = await _repo.GetAllAsync();
            return Ok(txns);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var txn = await _repo.GetByIdAsync(id);
            if (txn == null) return NotFound();
            return Ok(txn);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Transaction transaction)
        {
            if (id != transaction.Id && transaction.Id != 0) return BadRequest("ID mismatch");

            var updated = await _repo.UpdateAsync(id, transaction);
            if (updated == null) return NotFound();

            // Append to ledger ONLY if it is mapped
            if (updated.Mapped)
            {
                await _ledgerWriter.AppendToLedgerAsync(updated);
            }

            return Ok(updated);
        }
    }
}
