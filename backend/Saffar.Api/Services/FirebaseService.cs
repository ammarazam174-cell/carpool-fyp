using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;

namespace Saffar.Api.Services
{
    public static class FirebaseService
    {
        private static bool _initialized = false;

        public static void Init()
        {
            if (_initialized) return;

            FirebaseApp.Create(new AppOptions()
            {
                Credential = GoogleCredential.FromFile(
                    Path.Combine(Directory.GetCurrentDirectory(),
                    "firebase/firebase-adminsdk.json"))
            });

            _initialized = true;
        }
    }
}
