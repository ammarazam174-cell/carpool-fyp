import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_PORT = 5000;

// Resolution priority:
//   1. EXPO_PUBLIC_API_URL — explicit override (set-ip.js writes this on
//      `npm start`; can also be set by hand for tunnels/staging).
//   2. Expo dev-server host (Constants.expoConfig.hostUri / debuggerHost).
//      This is the IP/host Metro is bound to, which equals the host machine
//      running the backend during local dev — so it Just Works whether the
//      phone is on WiFi or the laptop's hotspot, with no manual edit.
//   3. Platform-specific localhost fallback (Android emulator → 10.0.2.2).
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants.expoGoConfig as any)?.debuggerHost ??
    (Constants.manifest2 as any)?.extra?.expoClient?.hostUri ??
    (Constants as any).manifest?.debuggerHost;

  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : null;
  if (host) return `http://${host}:${API_PORT}`;

  return Platform.OS === "android"
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

const baseURL = resolveBaseUrl();
console.log("[api] baseURL =", baseURL);

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

// Endpoints that must never carry a JWT — sending a stale/expired token to
// a public auth route makes the server's JWT bearer middleware reject the
// request before [AllowAnonymous] is reached.
const PUBLIC_AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

api.interceptors.request.use(async (config) => {
  const url = config.url ?? "";
  if (PUBLIC_AUTH_PATHS.some((p) => url.startsWith(p))) {
    if (config.headers) {
      delete (config.headers as Record<string, unknown>).Authorization;
    }
    return config;
  }

  const token = await SecureStore.getItemAsync("saffar_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type UnauthorizedHandler = () => void | Promise<void>;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Surface the resolved baseURL on every failure so it's obvious from the
    // device logs what host the app actually tried — the #1 cause of mobile
    // timeouts is hitting an IP the phone can't reach.
    const status = error?.response?.status;
    const cfg = error?.config;
    const fullUrl = cfg ? `${cfg.baseURL ?? ""}${cfg.url ?? ""}` : "(unknown)";
    if (status) {
      console.warn(`[api] ${cfg?.method?.toUpperCase()} ${fullUrl} → ${status}`);
    } else {
      console.warn(
        `[api] ${cfg?.method?.toUpperCase()} ${fullUrl} failed: ${error?.message}`
      );
    }

    if (status === 401 && onUnauthorized) {
      await onUnauthorized();
    }

    // Rewrite axios's stock "timeout of 30000ms exceeded" / "Network Error"
    // messages to include the host that was actually attempted. With the
    // original message it's impossible to tell from the UI whether (a) the
    // resolved IP was wrong, (b) the backend isn't running, or (c) the
    // device can't reach the backend's network at all. With the host in the
    // message you can spot all three immediately.
    if (!status && error?.message) {
      const host = cfg?.baseURL ?? "(no baseURL)";
      if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
        error.message = `Cannot reach server at ${host} (timed out). Check the device is on the same network as the laptop and that the backend is running.`;
      } else if (/network/i.test(error.message)) {
        error.message = `Network error contacting ${host}. Confirm the URL is reachable from this device's browser.`;
      }
    }
    return Promise.reject(error);
  }
);
