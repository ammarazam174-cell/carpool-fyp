import * as SecureStore from "expo-secure-store";
import type { SessionUser } from "@/types/auth";

const TOKEN_KEY = "saffar_token";
const USER_KEY = "saffar_user";

export const sessionStorage = {
  async load(): Promise<{ token: string; user: SessionUser } | null> {
    const [token, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (!token || !userJson) return null;
    try {
      return { token, user: JSON.parse(userJson) as SessionUser };
    } catch {
      return null;
    }
  },

  async save(token: string, user: SessionUser): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },
};
