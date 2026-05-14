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

type VehicleState = Pick<SessionUser, "hasVehicle" | "hasApprovedVehicle">;

async function fetchVehicleState(
  role: SessionUser["role"]
): Promise<VehicleState> {
  // Non-driver roles are never gated by vehicle state; treat both flags as
  // satisfied so the navigator doesn't bounce them.
  if (role !== "Driver") {
    return { hasVehicle: true, hasApprovedVehicle: true };
  }
  try {
    const list = await listMyVehicles();
    return {
      hasVehicle: list.length > 0,
      hasApprovedVehicle: list.some((v) => v.isVerified),
    };
  } catch (err) {
    // If the call fails we stay on the safer side — route to AddVehicle — rather
    // than accidentally letting a driver past the gate on a transient error.
    console.warn("[Auth] fetchVehicleState failed:", err);
    return { hasVehicle: false, hasApprovedVehicle: false };
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
      hasApprovedVehicle: false,
    };
    await sessionStorage.save(res.token, baseUser);
    setToken(res.token);
    setUser(baseUser);

    // Only drivers with a completed profile can have a vehicle — skip the
    // probe otherwise. For non-drivers both flags are trivially satisfied.
    const vehicleState: VehicleState =
      res.role === "Driver" && res.isProfileComplete
        ? await fetchVehicleState(res.role)
        : { hasVehicle: true, hasApprovedVehicle: true };

    const sessionUser: SessionUser = { ...baseUser, ...vehicleState };
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
    // A newly-added vehicle is always admin-pending (IsVerified=false on
    // create), so don't flip hasApprovedVehicle on — only set hasVehicle.
    // If the driver already had an approved vehicle, that flag stays true via
    // `...user`.
    const updatedUser: SessionUser = {
      ...user,
      hasVehicle: true,
      isProfileComplete: true,
    };
    console.log("[Auth] markVehicleAdded →", {
      hasVehicle: updatedUser.hasVehicle,
      hasApprovedVehicle: updatedUser.hasApprovedVehicle,
    });
    // Persist first so a cold-start right after the flip still sees the flags.
    if (token) await sessionStorage.save(token, updatedUser);
    setUser(updatedUser);
  }, [user, token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const [profile, vehicleState] = await Promise.all([
        getMyProfile(),
        fetchVehicleState(user?.role ?? "Passenger"),
      ]);
      setUser((prev) => {
        if (!prev) return prev;
        const next: SessionUser = {
          ...prev,
          fullName: profile.fullName,
          isProfileComplete: profile.isProfileComplete,
          isVerified: profile.isVerified,
          status: profile.status,
          ...vehicleState,
        };
        console.log("[Auth] refreshUser →", {
          status: profile.status,
          hasVehicle: next.hasVehicle,
          hasApprovedVehicle: next.hasApprovedVehicle,
        });
        // Persist so a cold-start after approval still sees the fresh flags.
        void sessionStorage.save(token, next);
        return next;
      });
    } catch (err) {
      console.warn("[Auth] refreshUser failed:", err);
    }
  }, [token, user?.role]);

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
