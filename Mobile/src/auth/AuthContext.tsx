import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { login as apiLogin, listMyVehicles, getMyProfile } from "@/api/api";
import { setUnauthorizedHandler } from "@/api/axios";
import { sessionStorage } from "./storage";
import type { SessionUser } from "@/types/auth";

interface AuthCtx {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  markProfileComplete: () => Promise<void>;
  markVehicleAdded: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

async function fetchHasVehicle(role: SessionUser["role"]): Promise<boolean> {
  if (role !== "Driver") return true; // Non-driver roles are never gated by vehicle.
  try {
    const list = await listMyVehicles();
    return list.length > 0;
  } catch {
    // If the call fails we treat it as "not proven" so the user is routed to AddVehicle —
    // safer than accidentally letting a driver past the gate on a transient error.
    return false;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    await sessionStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      const session = await sessionStorage.load();
      if (session) {
        setToken(session.token);
        setUser(session.user);
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    // Persist token first so the subsequent vehicles call is authenticated.
    const baseUser: SessionUser = {
      id: res.id,
      fullName: res.fullName,
      role: res.role,
      isProfileComplete: res.isProfileComplete,
      isVerified: res.isVerified,
      status: res.status,
      hasVehicle: false,
    };
    await sessionStorage.save(res.token, baseUser);
    setToken(res.token);
    setUser(baseUser);

    // Only drivers with a completed profile can have a vehicle — skip the probe otherwise.
    const hasVehicle =
      res.role === "Driver" && res.isProfileComplete
        ? await fetchHasVehicle(res.role)
        : res.role !== "Driver";

    const sessionUser: SessionUser = { ...baseUser, hasVehicle };
    await sessionStorage.save(res.token, sessionUser);
    setUser(sessionUser);
  }, []);

  const markProfileComplete = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: SessionUser = { ...prev, isProfileComplete: true };
      if (token) void sessionStorage.save(token, next);
      return next;
    });
  }, [token]);

  const markVehicleAdded = useCallback(async () => {
    if (!user) {
      console.warn("[Auth] markVehicleAdded called with no user — noop");
      return;
    }
    const updatedUser: SessionUser = {
      ...user,
      hasVehicle: true,
      isProfileComplete: true,
    };
    console.log("User after vehicle:", updatedUser);
    // Persist first so a cold-start right after the flip still sees the flags.
    if (token) await sessionStorage.save(token, updatedUser);
    setUser(updatedUser);
  }, [user, token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await getMyProfile();
      setUser((prev) => {
        if (!prev) return prev;
        const next: SessionUser = {
          ...prev,
          fullName: profile.fullName,
          isProfileComplete: profile.isProfileComplete,
          isVerified: profile.isVerified,
          status: profile.status,
        };
        console.log("[Auth] refreshUser → status:", profile.status, next);
        // Persist so a cold-start after approval still sees the fresh status.
        void sessionStorage.save(token, next);
        return next;
      });
    } catch (err) {
      console.warn("[Auth] refreshUser failed:", err);
    }
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      login,
      logout,
      markProfileComplete,
      markVehicleAdded,
      refreshUser,
    }),
    [user, token, ready, login, logout, markProfileComplete, markVehicleAdded, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
