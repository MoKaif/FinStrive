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
        [HttpPost("sync-email-transactions")]
        public async Task<IActionResult> SyncImap([FromQuery] int? lookbackDays = null)
        {
            var result = await _imapService.CheckEmailsAsync(lookbackDays);
            return Ok(result);
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

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Transaction transaction)
        {
            if (transaction == null) return BadRequest("Transaction data is required");

            // Set defaults
            transaction.CreatedAt = DateTime.UtcNow;
            transaction.Mapped = true; // Manual transactions are considered mapped
            transaction.Source = "manual";

            var created = await _repo.CreateAsync(transaction);
            if (created == null) return BadRequest("Failed to create transaction");

            // Append to ledger since it's mapped
            await _ledgerWriter.AppendToLedgerAsync(created);

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Transaction transaction)
        {
            if (id != transaction.Id && transaction.Id != 0) return BadRequest("ID mismatch");

            var updated = await _repo.UpdateAsync(id, transaction);
            if (updated == null) return NotFound();

            // Append to ledger ONLY if it is mapped
            // Do not append skipped transactions to the ledger even if mapped is true
            if (updated.Mapped && !updated.Skipped)
            {
                await _ledgerWriter.AppendToLedgerAsync(updated);
            }

            return Ok(updated);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var txn = await _repo.GetByIdAsync(id);
            if (txn == null || txn.Skipped) return NotFound();
            return Ok(txn);
        }

        [HttpGet("balance/hdfc-net")]
        public async Task<IActionResult> GetHDFCBankNetBalance()
        {
            var netBalance = await _repo.GetHDFCBankNetBalanceAsync();
            return Ok(new { 
                account = "Assets:Banking:HDFCBank", 
                netBalance = netBalance,
                description = "Total money into account - Total money out of account"
            });
        }
    }
}
