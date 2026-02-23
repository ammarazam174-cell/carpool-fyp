using FirebaseAdmin.Messaging;

namespace Saffar.Api.Services
{
    public class PushNotificationService
    {
        public async Task SendAsync(string token, string title, string body)
        {
            var message = new Message()
            {
                Token = token,
                Notification = new Notification
                {
                    Title = title,
                    Body = body
                }
            };

            await FirebaseMessaging.DefaultInstance.SendAsync(message);
        }
    }
}
