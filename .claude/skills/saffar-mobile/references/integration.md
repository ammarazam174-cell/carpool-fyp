# Saffar Mobile — Backend Integration Reference

## Endpoint Map

Confirm the exact path/verb in the controller before wiring. These are the current controllers:

| Controller | File | Purpose |
|------------|------|---------|
| `AuthController` | `backend/Saffar.Api/Controllers/AuthController.cs` | `POST /api/auth/login`, `POST /api/auth/signup` |
| `UsersController` | `Controllers/UsersController.cs` | Profile fetch/update |
| `RideController` | `Controllers/RideController.cs` | Ride CRUD + search |
| `BookingController` | `Controllers/BookingController.cs` | Booking lifecycle |
| `VehicleController` | `Controllers/VehicleController.cs` | Driver vehicle CRUD |

DTO shapes live in `backend/Saffar.Api/DTOs/` — one file per concern. Mirror these in `src/types/`.

## JWT Payload

```json
{
  "userId": "42",
  "name": "...",
  "email": "...",
  "role": "Driver",
  "exp": 1700000000
}
```

- Read as `"userId"` — **not** `sub`.
- `role` is PascalCase: `"Admin" | "Driver" | "Passenger"`.

```ts
import { jwtDecode } from "jwt-decode";

interface SaffarToken {
  userId: string;
  name: string;
  email: string;
  role: "Admin" | "Driver" | "Passenger";
  exp: number;
}

const claims = jwtDecode<SaffarToken>(token);
```

## Base URL Matrix

| Environment | Value |
|-------------|-------|
| iOS simulator | `http://localhost:5000` |
| Android emulator | `http://10.0.2.2:5000` |
| Physical device on LAN | `http://<your-LAN-IP>:5000` |
| Expo Go via LAN | `http://<your-LAN-IP>:5000` |
| Tunnel (ngrok) | `https://<subdomain>.ngrok.io` |
| Production | `https://api.saffar.example.com` |

Resolve at runtime from `process.env.EXPO_PUBLIC_API_URL` or `Constants.expoConfig?.extra?.apiUrl`.

## CORS

Backend reads allowed origins from `appsettings.json` → `Cors:AllowedOrigins` (wired in `Program.cs`). For Expo dev add:

```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:19006",
    "http://10.0.2.2:19006",
    "exp://<your-LAN-IP>:19000"
  ]
}
```

For a tunneled URL add the tunnel origin too. **Restart `dotnet run` after editing `appsettings.json`.**

## Auth Flow

1. `POST /api/auth/login` with `{ email, password }` → `{ token }`.
2. `await SecureStore.setItemAsync("saffar_token", token)`.
3. `jwtDecode<SaffarToken>(token)` → populate `AuthContext.user`.
4. axios interceptor reads the token from `SecureStore` on each request.
5. On 401: clear `SecureStore`, reset `AuthContext`, navigate to `AuthStack`.

## Role Gating

```tsx
// src/navigation/RootNavigator.tsx (excerpt)
if (!ready) return <Splash />;
if (!user) return <AuthStack />;
if (user.role === "Driver") return <DriverTabs />;
if (user.role === "Passenger") return <PassengerTabs />;
// Admin is a web-only role; show a friendly "use the web app" screen
if (user.role === "Admin") return <Forbidden />;
return <Forbidden />;
```

## Push Notifications

Backend uses Firebase Admin SDK via `PushNotificationService.SendNotificationAsync(userId, title, body)`. Mobile side:

1. `await Notifications.requestPermissionsAsync()`.
2. Get Expo push token (dev) or FCM token (production / bare RN).
3. `POST /api/users/me/push-token` with the token (confirm route — add it on the backend if missing).
4. Handle `Notifications.addNotificationReceivedListener` in `App.tsx`.

**Production**: for Expo you must configure FCM credentials (server key) in the Expo dashboard, or eject to use `@react-native-firebase/messaging` directly.

## Known Backend Gotchas (inherited)

- Ride search endpoint currently leaks raw exception messages — display a generic error on mobile, never the raw body.
- File upload endpoints lack MIME validation — if doing image uploads, validate client-side too.
- No payment gateway yet — do **not** build a payment screen without a gateway decision.

## Suggested Type Mirrors

```ts
// src/types/auth.ts
export type Role = "Admin" | "Driver" | "Passenger";
export interface SessionUser { userId: string; name: string; email: string; role: Role; }
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { token: string; }

// src/types/ride.ts — mirror RideResponseDto and CreateRideDto
export interface Ride { id: number; /* ... */ }
export interface CreateRideRequest { /* ... */ }
```

Match fields exactly to the backend DTO — JSON casing is controlled by ASP.NET's default (camelCase) unless overridden.
