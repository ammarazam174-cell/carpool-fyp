---
name: saffar-mobile
description: |
  Guides React Native (Expo) development of the Saffar carpooling mobile app
  at the repo-root `Mobile/` directory against the existing ASP.NET Core 8
  backend. This skill should be used when scaffolding the mobile project,
  adding screens/navigation, wiring the typed API layer to
  `backend/Saffar.Api/` endpoints, implementing JWT auth with secure token
  storage, role-based guards (Driver and Passenger only — Admin stays on
  the web client), Google Maps, or Firebase push notifications. Encodes
  Saffar's backend quirks — custom `"userId"` claim, exact role casing,
  DTO-per-endpoint — so the mobile app stays consistent with the web
  client. Pair with `react-native-best-practices` for general RN expertise.
---

# Saffar Mobile — React Native Specialist

Guide for building the Saffar carpooling mobile app in React Native, integrated with the existing .NET 8 API.

## Scope

- **Location**: scaffolded at the repo-root `Mobile/` directory (sibling of `Frontend/` and `backend/`).
- **Roles served**: **Driver and Passenger only**. Admin features remain web-only (`Frontend/saffar-web/src/pages/admin/`).
- **In scope**: project scaffolding (Expo SDK 52+), navigation (`@react-navigation`), typed API layer, auth flow + secure storage, role guards, maps (`react-native-maps`), FCM push notifications, TailwindCSS-via-NativeWind styling, platform-specific concerns (Android/iOS).
- **Out of scope**: backend changes (use `saffar-backend`), web client work (use `saffar-frontend`), payment gateway (not integrated), native module authoring beyond configuration.
- **Companion skill**: `react-native-best-practices` for general RN patterns, perf, upgrade paths.

## Stack Decision (default — confirm with user before scaffolding)

- **Expo SDK 52+** with the managed workflow (fastest to ship; dev client only if a required native module isn't in Expo).
- **TypeScript strict mode**.
- **Navigation**: `@react-navigation/native` + native-stack + bottom-tabs.
- **HTTP**: `axios` (mirrors `saffar-web` API layer shape).
- **State/forms**: Context for auth; `@tanstack/react-query` for server state; `react-hook-form` + `zod` for forms.
- **Styling**: NativeWind (Tailwind for RN) to match the web app's vocabulary.
- **Secure storage**: `expo-secure-store` for the JWT (**not** `AsyncStorage`).
- **Maps**: `react-native-maps` (Google provider on Android, Apple on iOS) + `expo-location`.
- **Push**: `expo-notifications` + FCM credentials (backend already uses Firebase Admin).
- **Env**: `expo-constants` reading `EXPO_PUBLIC_API_URL` from `.env` / `app.config.ts`.

If the user wants **bare React Native CLI** instead of Expo, swap: `react-native-config` for env, `@react-native-async-storage/async-storage` + `react-native-keychain` for secure storage, `@react-native-firebase/*` for push.

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase — backend** | Confirm endpoint path, verb, DTO shapes in `backend/Saffar.Api/Controllers/` and `DTOs/` |
| **Codebase — web** | Mirror wrapper shape from `Frontend/saffar-web/src/api/api.ts` and types from `src/types/` |
| **CLAUDE.md** | Project-level conventions |
| **Conversation** | Required roles, target platforms (iOS/Android/both), Expo vs bare |
| **Skill References** | `references/integration.md` (backend quirks), `references/setup.md` (scaffolding) |
| **Companion skill** | `react-native-best-practices` for perf, navigation, upgrade guidance |

## Required Clarifications (ask before scaffolding)

1. **Expo managed or bare RN CLI?** Default recommendation: Expo managed.
2. **Target platforms**: iOS only, Android only, or both?
3. **Which roles** does this app serve? Default for Saffar: **Driver + Passenger only** (Admin stays on the web client).
4. **Mobile project location**: Saffar's convention is the repo-root `Mobile/` directory.

## Optional Clarifications

5. Styling library preference (NativeWind vs StyleSheet vs another).
6. Offline support expectations (read-only cache vs full offline).
7. Deep-link scheme / universal-link domain for the deployed app.

Note: Avoid asking too many questions in a single message.

## Backend Integration — Non-Negotiables

These match `saffar-backend` / `saffar-frontend` exactly. Getting them wrong breaks auth silently.

- [ ] **JWT claim key is `"userId"`** — not `sub`, not `ClaimTypes.NameIdentifier`. Decode and read it as `"userId"`.
- [ ] **Role casing is PascalCase**: `"Admin"`, `"Driver"`, `"Passenger"`. Comparisons like `role === "driver"` will silently fail.
- [ ] **Token storage**: use `expo-secure-store` (Expo) or `react-native-keychain` (bare). Never `AsyncStorage` for the JWT.
- [ ] **Base URL**: `EXPO_PUBLIC_API_URL` → for local dev use LAN IP (`http://192.168.x.x:5000`), **not** `localhost` — device/emulator can't reach the host's localhost directly (Android emulator special case: `10.0.2.2`).
- [ ] **Auth header**: `Authorization: Bearer <token>` via a single axios interceptor. No manual header setting in screens.
- [ ] **CORS**: backend `Cors:AllowedOrigins` in `appsettings.json` must include the dev host (`http://localhost:19006` for Expo web / LAN IP for device).

## Must Follow

- [ ] Every API call goes through a typed wrapper in `src/api/api.ts`. Never call `axios` directly from a screen.
- [ ] Auth state lives in `AuthContext` exposing `{ user, token, login, logout, ready }`. Screens read it via `useContext`.
- [ ] Role-restricted screens are gated by a `<ProtectedScreen allowedRoles={[...]} />` wrapper or a navigator-level guard.
- [ ] Types in `src/types/` — no `any`.
- [ ] Server state via `@tanstack/react-query`; mutations invalidate the affected query keys.
- [ ] Forms via `react-hook-form` + `zod`; show inline errors.
- [ ] Styling via NativeWind utility classes (if chosen). Avoid inline `style={{}}` except for dynamic values that can't be expressed in Tailwind.
- [ ] On app start, rehydrate the token from `SecureStore` **before** rendering navigators — gate on an `AuthContext.ready` flag.

## Must Avoid

- Storing the JWT in `AsyncStorage` or plain state only.
- Hardcoding `http://localhost:5000` — the device can't reach it.
- Calling `axios` directly from a component.
- Comparing roles with wrong casing.
- Rendering the protected stack before the token has been rehydrated (causes a flash to login on cold start).
- Requesting location/notification permissions without a rationale dialog.
- Using `react-native-maps` without configuring the Google API key for Android (`app.config.ts` → `android.config.googleMaps.apiKey`).

## Workflow: Scaffold the Project

1. Confirm the required clarifications above.
2. Create the project (run from repo root):
   ```bash
   npx create-expo-app@latest Mobile -t expo-template-blank-typescript
   cd Mobile
   ```
3. Add core deps:
   ```bash
   npx expo install expo-secure-store expo-constants expo-location expo-notifications react-native-maps
   npm i axios @tanstack/react-query @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context react-hook-form zod jwt-decode
   npm i -D nativewind tailwindcss@3
   ```
4. Create the directory layout in the next section.
5. Wire: `App.tsx` → `AuthProvider` → `QueryClientProvider` → `RootNavigator` (splits Auth stack vs App tabs based on `user`).
6. Add `.env` with `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000`, mirror to `app.config.ts`.
7. Smoke-test login flow end-to-end against a running backend.

## Proposed Directory Layout

```
Mobile/
├── app.config.ts
├── src/
│   ├── api/
│   │   ├── axios.ts         # instance + JWT interceptor
│   │   └── api.ts           # typed wrappers
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   └── storage.ts       # SecureStore wrappers
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── DriverTabs.tsx
│   │   └── PassengerTabs.tsx
│   ├── screens/
│   │   ├── auth/            # Login, Signup
│   │   ├── driver/
│   │   └── passenger/
│   ├── components/          # shared UI (Button, Input, MapPicker)
│   ├── types/               # mirror backend DTOs
│   ├── hooks/               # useAuth, useCurrentUser
│   └── services/            # pushNotifications, location
└── assets/
```

> Admin role stays on the web client (`Frontend/saffar-web/src/pages/admin/`). No `AdminStack` / `admin/` subtree in mobile.

## Workflow: Add a New Screen

1. Read the backend controller/DTO the screen calls.
2. Add request/response types in `src/types/`.
3. Add a typed wrapper in `src/api/api.ts`.
4. Build the screen in `src/screens/<role>/<Name>.tsx` — use `react-query` for fetching, `react-hook-form` + `zod` for forms.
5. Register the route in the appropriate role navigator.
6. Test cold-start auth: kill app → reopen → should land on protected screen without a login flash (means `AuthContext.ready` gate works).

## Examples

### Good — axios instance with JWT interceptor + SecureStore

```ts
// src/api/axios.ts
import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL,
  timeout: 15_000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("saffar_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

```ts
// src/api/api.ts
import { api } from "./axios";
import type { Ride, CreateRideRequest } from "../types/ride";

export async function listRides(): Promise<Ride[]> {
  const { data } = await api.get<Ride[]>("/api/ride");
  return data;
}

export async function createRide(body: CreateRideRequest): Promise<Ride> {
  const { data } = await api.post<Ride>("/api/ride", body);
  return data;
}
```

### Good — auth context reads custom claim

```tsx
// src/auth/AuthContext.tsx (excerpt)
import { jwtDecode } from "jwt-decode";
type SaffarToken = { userId: string; role: "Admin" | "Driver" | "Passenger"; name: string; email: string; exp: number };

const decoded = jwtDecode<SaffarToken>(token);
setUser({ userId: decoded.userId, role: decoded.role, name: decoded.name, email: decoded.email });
```

### Bad — localhost + AsyncStorage + wrong claim

```ts
const api = axios.create({ baseURL: "http://localhost:5000" });        // ❌ device can't reach host localhost
await AsyncStorage.setItem("token", jwt);                              // ❌ not secure
const id = decoded.sub;                                                // ❌ claim key is "userId"
if (user.role === "driver") { /* ... */ }                              // ❌ casing mismatch
```

## Platform-Specific Watch-outs

- **Android emulator**: host is `10.0.2.2`, not `localhost`.
- **iOS simulator**: `localhost` works, but a physical device on the same Wi‑Fi needs the LAN IP.
- **HTTP in dev**: iOS requires `NSAllowsArbitraryLoads` or ATS exemptions for plain HTTP. Expo sets this for dev; production must be HTTPS.
- **Android Maps**: `android.config.googleMaps.apiKey` in `app.config.ts` + enable "Maps SDK for Android" in Google Cloud.
- **iOS Maps**: Apple Maps works by default; to use Google on iOS enable "Maps SDK for iOS" and pass `provider={PROVIDER_GOOGLE}`.
- **Push on iOS**: requires an Apple Developer account + APNs key uploaded to Firebase.
- **Reverse-proxy dev**: if using `ngrok` to expose the backend, update `Cors:AllowedOrigins` in `appsettings.json` **and** the `EXPO_PUBLIC_API_URL`.

## Output Specification

When completing a mobile task, deliver:

1. **Changed files list** with paths.
2. **New screens/routes** with allowed roles.
3. **New API wrapper(s)** in `src/api/api.ts` with types.
4. **Manual-test record**: platform(s) tested (iOS sim / Android emu / device), golden path + one error path.
5. **Env/config changes** (new keys in `.env`, `app.config.ts`, or `appsettings.json` CORS).

## Output Checklist

- [ ] `npx tsc --noEmit` is clean.
- [ ] `npm run lint` is clean (if configured).
- [ ] `expo start` runs without red-screen on cold start.
- [ ] No direct `axios` imports in screens.
- [ ] JWT lives in `SecureStore`, never `AsyncStorage`.
- [ ] Role comparisons use PascalCase.
- [ ] Base URL is resolved from env (no hardcoded host).
- [ ] No `any` types introduced.
- [ ] Cold-start reload lands on the correct navigator (no login flash).

## Reference Resources

| Resource | URL | Use For |
|----------|-----|---------|
| Expo docs | https://docs.expo.dev | SDK APIs, config, builds |
| React Navigation v7 | https://reactnavigation.org/docs/getting-started | Stacks, tabs, guards |
| React Query | https://tanstack.com/query/latest/docs/framework/react/overview | Server state |
| react-native-maps | https://github.com/react-native-maps/react-native-maps | Maps |
| expo-secure-store | https://docs.expo.dev/versions/latest/sdk/securestore/ | JWT storage |
| expo-notifications | https://docs.expo.dev/versions/latest/sdk/notifications/ | Push + FCM |
| NativeWind | https://www.nativewind.dev | Tailwind for RN |
| jwt-decode | https://github.com/auth0/jwt-decode | Decode JWT on client |

If a pattern isn't covered here or in `references/`, fetch the official docs above rather than guessing, and fall back to the `react-native-best-practices` companion skill for general RN patterns.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/integration.md` | Saffar-specific backend quirks, endpoint map, CORS/env setup |
| `references/setup.md` | Full scaffolding walkthrough with copy-pasteable config |
