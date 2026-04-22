# Saffar Mobile — Scaffolding Walkthrough

Copy-pasteable setup for the default stack (Expo managed + TypeScript + NativeWind).

## 1. Create the Project

```bash
# Run from repo root
npx create-expo-app@latest Mobile -t expo-template-blank-typescript
cd Mobile
```

## 2. Install Dependencies

```bash
# Expo-managed native modules
npx expo install expo-secure-store expo-constants expo-location expo-notifications react-native-maps react-native-screens react-native-safe-area-context

# Pure JS
npm i axios @tanstack/react-query @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-hook-form zod jwt-decode

# Styling
npm i nativewind
npm i -D tailwindcss@3
npx tailwindcss init
```

## 3. NativeWind Setup

`tailwind.config.js`:

```js
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

`babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
```

`global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import `./global.css` at the top of `App.tsx`.

## 4. Environment

`.env`:

```
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

`app.config.ts`:

```ts
import "dotenv/config";
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Saffar",
  slug: "saffar-mobile",
  scheme: "saffar",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: { supportsTablet: false, bundleIdentifier: "com.saffar.mobile" },
  android: {
    package: "com.saffar.mobile",
    config: {
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY! },
    },
  },
  plugins: ["expo-secure-store", "expo-notifications", "expo-location"],
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL },
};
export default config;
```

## 5. Auth Storage Wrapper

`src/auth/storage.ts`:

```ts
import * as SecureStore from "expo-secure-store";
const KEY = "saffar_token";

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (v: string) => SecureStore.setItemAsync(KEY, v),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
```

## 6. axios Instance

See `SKILL.md` "Good" example. Keep it in `src/api/axios.ts`.

## 7. Auth Context

`src/auth/AuthContext.tsx` (skeleton):

```tsx
import { createContext, useEffect, useState, PropsWithChildren } from "react";
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from "./storage";
import { api } from "../api/axios";
import type { SessionUser } from "../types/auth";

interface Ctx {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await tokenStorage.get();
      if (t) hydrate(t);
      setReady(true);
    })();
  }, []);

  function hydrate(t: string) {
    const claims = jwtDecode<any>(t);
    if (claims.exp * 1000 < Date.now()) return;
    setToken(t);
    setUser({ userId: claims.userId, name: claims.name, email: claims.email, role: claims.role });
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string }>("/api/auth/login", { email, password });
    await tokenStorage.set(data.token);
    hydrate(data.token);
  }

  async function logout() {
    await tokenStorage.clear();
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, ready, login, logout }}>{children}</AuthContext.Provider>;
}
```

## 8. Root Navigator

`src/navigation/RootNavigator.tsx`:

```tsx
import { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthContext } from "../auth/AuthContext";
import AuthStack from "./AuthStack";
import DriverTabs from "./DriverTabs";
import PassengerTabs from "./PassengerTabs";
import Splash from "../screens/Splash";
import Forbidden from "../screens/Forbidden";

export default function RootNavigator() {
  const { user, ready } = useContext(AuthContext);
  if (!ready) return <Splash />;
  return (
    <NavigationContainer>
      {!user && <AuthStack />}
      {user?.role === "Driver" && <DriverTabs />}
      {user?.role === "Passenger" && <PassengerTabs />}
      {user?.role === "Admin" && <Forbidden />}
    </NavigationContainer>
  );
}
```

## 9. App.tsx

```tsx
import "./global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

## 10. Backend CORS

Edit `backend/Saffar.Api/appsettings.json` → `Cors:AllowedOrigins` and add the Expo dev origins (see `integration.md`). Restart `dotnet run`.

## 11. Smoke Test

```bash
npx expo start
```

- Press `a` for Android emulator / `i` for iOS sim / scan QR for device.
- Log in with a known user → lands on the role-specific tabs.
- Kill the app and reopen → should land on the same screen without a login flash (confirms `ready` gating).
