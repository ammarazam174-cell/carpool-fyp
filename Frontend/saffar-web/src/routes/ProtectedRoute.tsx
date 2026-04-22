import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

type Props = {
  children: ReactNode;
  role: "Driver" | "Passenger" | "Admin"; // ✅ ADD ADMIN
};

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth();

  // ⏳ jab tak auth load ho raha hai
  if (loading) {
    return <div>Loading...</div>;
  }

  // ❌ not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ❌ role mismatch
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // ✅ access allowed
  return children;
}