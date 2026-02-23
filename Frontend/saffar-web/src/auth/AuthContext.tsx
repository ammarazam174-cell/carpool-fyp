import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type Role = "Driver" | "Passenger";

type AuthUser = {
  token: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (token: string, role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") as Role | null;
    return token && role ? { token, role } : null;
  });

  const login = (token: string, role: Role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setUser({ token, role });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};