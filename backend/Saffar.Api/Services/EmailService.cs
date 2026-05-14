using System.Net;
using System.Net.Mail;

namespace Saffar.Api.Services
{
    public interface IEmailService
    {
        Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
    }

    public class SmtpSettings
    {
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public bool EnableSsl { get; set; } = true;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string FromName { get; set; } = "Saffar";
    }

    // Gmail SMTP-backed email sender. Reads `SmtpSettings` from configuration.
    // For Gmail, `Password` must be a Google App Password (Account → Security
    // → 2-Step Verification → App passwords). Regular Gmail passwords are
    // rejected. Spaces in the App Password are stripped at use time.
    //
    // Production swap-in: replace this one class with a SendGrid/Mailgun
    // implementation behind the same IEmailService interface.
    public class SmtpEmailService : IEmailService
    {
        private readonly SmtpSettings _opts;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration cfg, ILogger<SmtpEmailService> logger)
        {
            _opts = cfg.GetSection("SmtpSettings").Get<SmtpSettings>() ?? new SmtpSettings();
            _logger = logger;
        }

        public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(_opts.Username) || string.IsNullOrWhiteSpace(_opts.Password))
            {
                _logger.LogError("[Email] SmtpSettings.Username/Password missing — cannot send. " +
                                 "To: {To}, Subject: {Subject}", to, subject);
                throw new InvalidOperationException(
                    "SMTP credentials are not configured. Set SmtpSettings.Username and SmtpSettings.Password in appsettings.json.");
            }

            var password = _opts.Password.Replace(" ", "");

            using var client = new SmtpClient(_opts.Host, _opts.Port)
            {
                EnableSsl = _opts.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_opts.Username, password),
            };

            using var msg = new MailMessage
            {
                From = new MailAddress(_opts.Username, _opts.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };
            msg.To.Add(to);

            try
            {
                _logger.LogInformation("[Email] Sending '{Subject}' to {To} via {Host}:{Port}",
                    subject, to, _opts.Host, _opts.Port);
                await client.SendMailAsync(msg, ct);
                _logger.LogInformation("[Email] Sent '{Subject}' to {To}", subject, to);
            }
            catch (SmtpException ex)
            {
                _logger.LogError(ex,
                    "[Email] SMTP error sending '{Subject}' to {To}. StatusCode={Status}, Inner={Inner}",
                    subject, to, ex.StatusCode, ex.InnerException?.Message);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Email] Failed to send '{Subject}' to {To}", subject, to);
                throw;
            }
        }
    }
}
