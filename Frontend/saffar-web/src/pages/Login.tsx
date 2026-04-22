import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;
      login(data.token, data.role);

      if (data.role === "Admin") { navigate("/admin"); return; }

      if (!data.isProfileComplete) {
        navigate("/complete-profile");
        return;
      }
      navigate(data.role === "Driver" ? "/driver" : "/passenger");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl shadow-blue-900/50">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Saffar</h1>
          <p className="text-blue-300 mt-1.5 text-sm font-medium">
            Login to continue your journey
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome back 👋</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your Saffar account</p>

          {/* Inline error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              <span className="text-base">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                  ✉
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="ali@example.com"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-gray-50 hover:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-16 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-gray-50 hover:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[.98] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  Signing in…
                </>
              ) : (
                "Login →"
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium tracking-wide">NEW TO SAFFAR?</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={() => navigate("/signup")}
            className="w-full border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm"
          >
            Create an account
          </button>
        </div>

        {/* Trust row */}
        <div className="flex justify-center gap-6 mt-6 flex-wrap">
          {[["🔒", "Secure Login"], ["✓", "Verified Platform"], ["🛡", "Data Protected"]].map(
            ([icon, label]) => (
              <span key={label} className="text-xs text-blue-300 flex items-center gap-1">
                <span>{icon}</span> {label}
              </span>
            )
          )}
        </div>

      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
