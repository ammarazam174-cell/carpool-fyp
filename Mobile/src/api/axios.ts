import axios from "axios";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  console.warn("[api] EXPO_PUBLIC_API_URL is not set — requests will fail.");
}

export const api = axios.create({
  baseURL,
  timeout: 15_000,
});

api.interceptors.request.use(async (config) => {
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
    if (error?.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);
