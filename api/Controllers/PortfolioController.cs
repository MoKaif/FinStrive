using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using ExcelDataReader;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using api.Extensions;
using api.Interfaces;
using api.Models;
using api.Service;

namespace api.Controllers
{
    [Route("api/portfolio")]
    [ApiController]
    public class PortfolioController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IStockRepository _stockRepo;
        private readonly IPortfolioRepository _portfolioRepo;
        private readonly IFMPService _fmpService;
        private readonly IWebHostEnvironment _env;
        private readonly string _storagePath;
        private readonly string _sessionFile;

        public PortfolioController(
            UserManager<AppUser> userManager,
            IStockRepository stockRepo,
            IPortfolioRepository portfolioRepo,
            IFMPService fmpService,
            IWebHostEnvironment env)
        {
            _userManager = userManager;
            _stockRepo = stockRepo;
            _portfolioRepo = portfolioRepo;
            _fmpService = fmpService;
            _env = env;
            _storagePath = Path.Combine(env.ContentRootPath, "PortfolioFiles");
            Directory.CreateDirectory(_storagePath);
            _sessionFile = Path.Combine(env.ContentRootPath, "Checkpoint", "portfolio_session.txt");
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetUserPortfolio()
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            return Ok(userPortfolio);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddPortfolio([FromQuery] string symbol)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var stock = await _stockRepo.GetBySymbolAsync(symbol);
            if (stock == null)
            {
                stock = await _fmpService.FindStockBySymbolAsync(symbol);
                if (stock == null)
                {
                    return BadRequest("Stock does not exist");
                }
                await _stockRepo.CreateAsync(stock);
            }

            var userPortfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            if (userPortfolio.Any(e => e.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase)))
                return BadRequest("Cannot add stock to portfolio");

            var portfolioModel = new Portfolio
            {
                StockId = stock.Id,
                AppUserId = appUser.Id
            };

            await _portfolioRepo.CreateAsync(portfolioModel);
            return Created(string.Empty, null);
        }

        [HttpDelete]
        [Authorize]
        public async Task<IActionResult> DeletePortfolio([FromQuery] string symbol)
        {
            var username = User.GetUsername();
            var appUser = await _userManager.FindByNameAsync(username);
            var portfolio = await _portfolioRepo.GetUserPortfolio(appUser);
            var exists = portfolio.Any(s => s.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase));

            if (!exists)
                return BadRequest("Stock not in your portfolio");

            await _portfolioRepo.DeletePortfolio(appUser, symbol);
            return Ok();
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");

            var fileName = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss_") + Path.GetFileName(file.FileName);
            var savePath = Path.Combine(_storagePath, fileName);

            using (var stream = System.IO.File.Create(savePath))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { file = fileName });
        }

        [HttpGet("holdings")]
        public IActionResult GetHoldings()
        {
            var files = Directory.GetFiles(_storagePath);
            if (!files.Any()) return Ok(new { holdings = new List<object>() });

            var latest = files.OrderByDescending(f => System.IO.File.GetLastWriteTimeUtc(f)).First();
            System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

            using (var stream = System.IO.File.Open(latest, FileMode.Open, FileAccess.Read))
            using (var reader = ExcelReaderFactory.CreateReader(stream))
            {
                var results = new List<Dictionary<string, object>>();
                var header = new List<string>();
                var first = true;
                while (reader.Read())
                {
                    if (first)
                    {
                        for (int c = 0; c < reader.FieldCount; c++)
                        {
                            var h = reader.GetValue(c)?.ToString() ?? ("col" + c);
                            header.Add(h);
                        }
                        first = false;
                        continue;
                    }

                    var row = new Dictionary<string, object>();
                    bool empty = true;
                    for (int c = 0; c < header.Count; c++)
                    {
                        var val = reader.GetValue(c);
                        if (val != null && val.ToString().Trim().Length > 0) empty = false;
                        row[header[c]] = val ?? string.Empty;
                    }
                    if (!empty) results.Add(row);
                }

                return Ok(new { file = Path.GetFileName(latest), holdings = results });
            }
        }

        [HttpPost("session")]
        public async Task<IActionResult> SetSession([FromBody] SessionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.PhpSession)) return BadRequest("session required");
            Directory.CreateDirectory(Path.GetDirectoryName(_sessionFile)!);
            await System.IO.File.WriteAllTextAsync(_sessionFile, dto.PhpSession);
            return Ok();
        }

        [HttpGet("session")]
        public IActionResult GetSession()
        {
            if (!System.IO.File.Exists(_sessionFile)) return Ok(new { session = (string?)null });
            var val = System.IO.File.ReadAllText(_sessionFile);
            return Ok(new { session = val });
        }

        private HttpClient BuildClientWithSession()
        {
            var handler = new HttpClientHandler() { CookieContainer = new CookieContainer(), UseCookies = true };
            var client = new HttpClient(handler);

            if (System.IO.File.Exists(_sessionFile))
            {
                var sess = System.IO.File.ReadAllText(_sessionFile).Trim();
                if (!string.IsNullOrEmpty(sess))
                {
                    handler.CookieContainer.SetCookies(new Uri("https://www.valueresearchonline.com"), "PHPSESSID=" + sess);
                }
            }

            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (FinStrive)");
            return client;
        }

        [HttpGet("period-returns")]
        public async Task<IActionResult> GetPeriodReturns([FromQuery] string labelIds, [FromQuery] string period = "1D", [FromQuery] string asOfDate = "")
        {
            var client = BuildClientWithSession();
            var url = $"https://www.valueresearchonline.com/api/my-investments/dashboard-period-returns/?label-ids={WebUtility.UrlEncode(labelIds)}&period={WebUtility.UrlEncode(period)}";
            if (!string.IsNullOrEmpty(asOfDate)) url += $"&as-of-date={WebUtility.UrlEncode(asOfDate)}";

            var resp = await client.GetAsync(url);
            var content = await resp.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }

        [HttpGet("performance")]
        public async Task<IActionResult> GetPerformance([FromQuery] string labelIds, [FromQuery] string period = "ALL", [FromQuery] string asOfDate = "")
        {
            var client = BuildClientWithSession();
            var url = $"https://www.valueresearchonline.com/api/my-investments/dashboard-performance/?label-ids={WebUtility.UrlEncode(labelIds)}&cid=26&period={WebUtility.UrlEncode(period)}";
            if (!string.IsNullOrEmpty(asOfDate)) url += $"&as-of-date={WebUtility.UrlEncode(asOfDate)}";

            var resp = await client.GetAsync(url);
            var content = await resp.Content.ReadAsStringAsync();
            return Content(content, "application/json");
        }

        public class SessionDto { public string? PhpSession { get; set; } }
    }
}
