import axios from "axios";

const HOST = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(
  /\/+$/,
  ""
);

const api = axios.create({
  baseURL: `${HOST}/api`,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Attach JWT token automatically — but never on public auth paths.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
];

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (PUBLIC_AUTH_PATHS.some((p) => url.startsWith(p))) {
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
});

export default api;

// ✅ Update Ride API
export const updateRide = async (id: string, data: any) => {
  const response = await api.put(`/rides/${id}`, data);
  return response.data;
};
