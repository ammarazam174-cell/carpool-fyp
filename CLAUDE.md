# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Saffar** is a carpooling platform (FYP) with three clients against a single ASP.NET Core 8 backend:

- **Web** (`Frontend/saffar-web/`) — React + TypeScript, serves **Admin, Driver, Passenger**.
- **Mobile** (`Mobile/`) — React Native (Expo managed) + TypeScript, serves **Driver, Passenger** only (Admin stays on web).
- **Backend** (`backend/Saffar.Api/`) — ASP.NET Core 8 + EF Core 8 + SQL Server.

---

## Commands

### Frontend (`Frontend/saffar-web/`)

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Backend (`backend/Saffar.Api/`)

```bash
dotnet build                              # Build the project
dotnet run                                # Run API at http://localhost:5000
dotnet ef database update                 # Apply pending EF Core migrations
dotnet ef migrations add <MigrationName>  # Create a new migration after model changes
```

### Mobile (`Mobile/`)

```bash
npm install                  # Install dependencies
npx expo start               # Dev server (press a=Android, i=iOS, w=web, r=reload)
npx expo start --tunnel      # Use when your phone is on a different network than the backend
npx expo start --clear       # Clear Metro cache (fixes stale builds after config changes)
npx tsc --noEmit             # Type check
npx expo prebuild            # Eject to bare workflow (generates ios/ + android/)

# Production builds — via EAS (requires `npm i -g eas-cli` and `eas login`)
eas build --platform android # Android build
eas build --platform ios     # iOS build (requires Apple Developer account)
```

**Base URL resolution** (set `EXPO_PUBLIC_API_URL` in `Mobile/.env`):

| Target | Value |
|--------|-------|
| Android emulator | `http://10.0.2.2:5000` |
| iOS simulator | `http://localhost:5000` |
| Physical device | `http://<host-LAN-IP>:5000` |

The backend must be running (`dotnet run`) before the mobile app can log in.

---

## Architecture

### Stack
- **Web:** React 18 + TypeScript + Vite + TailwindCSS + React Router v6
- **Mobile:** React Native + TypeScript + Expo SDK 54 (managed) + NativeWind + React Navigation v7 + React Query + expo-secure-store (JWT) + react-native-maps
- **Backend:** ASP.NET Core 8 + Entity Framework Core 8 (SQL Server / SQLEXPRESS)
- **Auth:** JWT Bearer tokens (HS256), role-based (Admin / Driver / Passenger). Mobile app supports Driver + Passenger; Admin is web-only.
- **External:** Firebase (push notifications, analytics), Google Maps API

### How They Connect
- **Web** reads `VITE_API_URL` from `Frontend/saffar-web/.env` (default `http://localhost:5000`). Axios instance in `src/api/axios.ts` attaches the JWT from `localStorage` to every request.
- **Mobile** reads `EXPO_PUBLIC_API_URL` from `Mobile/.env`. Axios instance in `Mobile/src/api/axios.ts` attaches the JWT from `expo-secure-store` to every request.
- **Backend** CORS lives in `Program.cs` (`AllowFrontend` policy) and currently allows the Vite dev origins plus Expo web origins.

### Frontend Structure
```
src/
├── api/          # axios.ts (interceptor), api.ts (typed endpoint wrappers)
├── auth/         # AuthContext.tsx — JWT decode, login/logout state
├── routes/       # AppRoutes.tsx — route definitions, ProtectedRoute.tsx — role guard
├── pages/
│   ├── Login.tsx / Signup.tsx
│   ├── admin/    — Admin dashboard
│   ├── driver/   — CreateRide, DriverBookings, DriverProfile
│   └── passenger/— PassengerDashboard, PassengerMyBookings, PassengerProfile
├── components/   # Shared UI (MapPicker uses @react-google-maps/api)
├── services/     # authService.ts
└── types/        # auth.ts and other TS interfaces
```

### Mobile Structure
```
Mobile/
├── App.tsx               # QueryClientProvider + AuthProvider + RootNavigator
├── app.json              # Expo config (name, slug, bundle IDs, plugins)
├── babel.config.js       # NativeWind + babel-preset-expo
├── metro.config.js       # withNativeWind
├── tailwind.config.js    # NativeWind preset, colors
├── global.css            # @tailwind directives
├── .env                  # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
└── src/
    ├── api/              # axios.ts (JWT interceptor), api.ts (typed wrappers)
    ├── auth/             # AuthContext.tsx, storage.ts (SecureStore)
    ├── navigation/       # RootNavigator, AuthStack, DriverTabs, PassengerTabs
    ├── screens/
    │   ├── auth/         # Login, Signup
    │   ├── driver/       # Dashboard, Profile
    │   ├── passenger/    # Dashboard, Profile
    │   ├── Splash.tsx
    │   └── Forbidden.tsx # Shown to Admin users (web-only role)
    └── types/            # auth.ts, ride.ts, booking.ts — mirror backend DTOs
```

### Backend Structure
```
backend/Saffar.Api/
├── Controllers/  # AuthController, UsersController, RideController, BookingController
├── Models/       # User, Ride, Booking, Vehicle, RideStop, Rating, UserNotification
├── Data/         # SaffarDbContext (EF Core)
├── DTOs/         # Request/response shapes (one DTO file per concern)
├── Services/     # JwtService, PushNotificationService, FirebaseService
└── Migrations/   # EF Core migration files
```

### Key Data Model Relationships
- `User` → many `Vehicle`s (cascade restrict)
- `Vehicle` → many `Ride`s
- `Ride` → many `Booking`s, many `RideStop`s
- `Booking` → one `Ride`, one Passenger (`User`)
- `Rating` links two users (rater / rated)

### Authentication Flow
1. `POST /api/auth/login` → returns JWT
2. Frontend stores token in `localStorage`, decoded in `AuthContext`
3. `ProtectedRoute` checks role from context before rendering pages
4. Backend `[Authorize(Roles = "...")]` attributes enforce access on controllers

---

## Configuration

| File | Key settings |
|------|-------------|
| `Frontend/saffar-web/.env` | `VITE_API_URL` |
| `Mobile/.env` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |
| `Mobile/app.json` | Bundle IDs, plugins (`expo-secure-store`, `expo-location`, `expo-notifications`) |
| `backend/Saffar.Api/appsettings.json` | DB connection string, JWT `Key`/`Issuer`/`Audience`/`DurationInMinutes` |
| `backend/Saffar.Api/Program.cs` | `AllowFrontend` CORS policy (Vite + Expo web origins) |
| `backend/Saffar.Api/Saffar.Api.csproj` | NuGet packages (EF Core, JWT Bearer, BCrypt, Firebase Admin, Swagger) |

Swagger UI is available at `http://localhost:5000/swagger` when running in Development mode.

---

## Database

- **Engine:** SQL Server LocalDB (`localhost\SQLEXPRESS`, database `SaffarDb`, trusted connection)
- **ORM:** Entity Framework Core 8 — code-first migrations
- **Password hashing:** BCrypt.Net-Next (never store plain-text passwords)
- After any model change, always create and apply a migration before running the API.
