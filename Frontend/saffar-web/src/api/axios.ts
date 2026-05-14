import axios from "axios";

// Base URL comes from `VITE_API_URL` in Frontend/saffar-web/.env
// (defaults to http://localhost:5000 for local dev). The browser always talks
// to the backend on the same host, so localhost — never the LAN IP the mobile
// app uses. Appending /api keeps all callsites writing paths like
// `/auth/login`, `/rides`, etc.
const HOST = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(
  /\/+$/,
  ""
);

const api = axios.create({
  baseURL: `${HOST}/api`,
  timeout: 30_000,
});

// Endpoints that must never carry a JWT — sending a stale/expired token to the
// login or registration routes makes the server's JWT bearer middleware
// reject the request with 401/403 *before* our [AllowAnonymous] controllers
// ever run. Strip the header for every public auth path.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
];

api.interceptors.request.use(
  (config) => {
    const url = config.url ?? "";
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => url.startsWith(p));

    if (isPublicAuth) {
      if (config.headers) {
        delete (config.headers as Record<string, unknown>).Authorization;
      }
      return config;
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
