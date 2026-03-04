using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using api.Interfaces;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace api.Service
{
    public class ImapService : IImapService
    {
        private readonly IConfiguration _config;
        private readonly IPdfService _pdfService;

        public ImapService(IConfiguration config, IPdfService pdfService)
        {
            _config = config;
            _pdfService = pdfService;
        }

        public async Task CheckEmailsAsync()
        {
            var email = _config["GmailAddress"];
            var password = _config["GoogleAppKey"];
            var customerId = _config["CustomerID"]; // Used as PDF password

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                Console.WriteLine("IMAP Credentials missing.");
                // Log or return
                return;
            }

            try
            {
                using (var client = new ImapClient())
                {
                    Console.WriteLine($"Attempting to connect to Gmail IMAP with email: {email}");
                    await client.ConnectAsync("imap.gmail.com", 993, true);
                    await client.AuthenticateAsync(email, password);

                    var inbox = client.Inbox;
                    await inbox.OpenAsync(FolderAccess.ReadOnly);

                    // Search for last 30 days to avoid fetching full history every time
                    var query = SearchQuery.And(
                        SearchQuery.DeliveredAfter(DateTime.Now.AddDays(-30)),
                        SearchQuery.And(
                            SearchQuery.FromContains("alerts@hdfcbank.bank.in"), // Changed to .net based on user request but typically it is hdfcbank.net
                            SearchQuery.SubjectContains("Account Statement")
                        )
                    );

                    // User said <alerts@hdfcbank.bank.in> explicitly.

                    var uids = await inbox.SearchAsync(query);

                    foreach (var uid in uids)
                    {
                        var message = await inbox.GetMessageAsync(uid);

                        foreach (var attachment in message.Attachments)
                        {
                            if (attachment is MimePart part && part.FileName.Contains("Account Statement.pdf"))
                            {
                                using (var stream = new MemoryStream())
                                {
                                    await part.Content.DecodeToAsync(stream);
                                    stream.Position = 0;
                                    await _pdfService.ImportPdfAsync(stream, customerId);
                                }
                            }
                        }
                    }

                    await client.DisconnectAsync(true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"IMAP Error: {ex.Message}");
            }
        }
    }
}
