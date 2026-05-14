import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Role = "Driver" | "Passenger" | "Admin";

type AuthUser = {
  token: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (token: string, role: Role) => void;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {

  // ✅ STATE (yahan hona chahiye)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ AUTO LOGIN (refresh pe)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") as Role | null;

    if (token && role) {
      setUser({ token, role });
    }

    setLoading(false);
  }, []);

  // ✅ LOGIN
  const login = (token: string, role: Role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setUser({ token, role });
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ custom hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};