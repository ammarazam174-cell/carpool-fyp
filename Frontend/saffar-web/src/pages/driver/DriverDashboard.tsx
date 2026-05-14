import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type DailyPoint = { date: string; earnings: number };

type RecentRide = {
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  earnings: number;
  passengers: number;
};

type Analytics = {
  totalEarnings: number;
  totalRides: number;
  thisMonthEarnings: number;
  todayEarnings: number;
  dailyData: DailyPoint[];
  recentRides: RecentRide[];
};

type VerificationProfile = { isVerified: boolean; status: string };

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, accent, icon,
}: {
  label: string; value: string; accent: string; icon: string;
}) {
  return (
    <div className={`bg-gray-800 rounded-2xl p-5 border-l-4 ${accent} shadow-lg flex items-start gap-4`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Custom tooltip for chart ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-green-400 font-bold text-sm">PKR {Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [profile, setProfile]     = useState<VerificationProfile | null>(null);

  useEffect(() => {
    api.get("/profile/me")
      .then(res => setProfile({ isVerified: res.data.isVerified, status: res.data.status }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/vehicle/my")
      .then(res => { if (res.data.length === 0) navigate("/driver/vehicles"); })
      .catch(() => navigate("/driver/add-vehicle"));
  }, []);

  useEffect(() => {
    api.get("/users/driver-analytics")
      .then(res => setAnalytics(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `PKR ${Number(n ?? 0).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Driver Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Your performance at a glance</p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
            {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* ── VERIFICATION BANNER ────────────────────────────────────────── */}
        {profile && !profile.isVerified && (
          <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl mb-6 border text-sm ${
            profile.status === "Rejected"
              ? "bg-red-950/60 border-red-700/50 text-red-300"
              : "bg-amber-950/60 border-amber-700/50 text-amber-300"
          }`}>
            <span className="text-xl mt-0.5">{profile.status === "Rejected" ? "❌" : "🕐"}</span>
            <div>
              <p className="font-semibold">
                {profile.status === "Rejected" ? "Profile Rejected" : "Verification Pending"}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {profile.status === "Rejected"
                  ? "Your documents were rejected. Please contact support."
                  : "Your profile is under admin review. Creating rides is disabled until approved."}
              </p>
            </div>
          </div>
        )}

        {/* ── QUICK ACTIONS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: profile?.isVerified ? "➕ Create Ride" : "➕ Ride (Pending)", path: "/driver/create-ride", color: "bg-blue-600 hover:bg-blue-700", disabled: !profile?.isVerified },
            { label: "🚗 My Rides",         path: "/driver/my-rides",   color: "bg-emerald-600 hover:bg-emerald-700" },
            { label: "📋 Bookings",         path: "/driver/bookings",   color: "bg-violet-600 hover:bg-violet-700"  },
            { label: "🚙 Vehicles",         path: "/driver/vehicles",   color: "bg-cyan-600 hover:bg-cyan-700"     },
            { label: "👤 Profile",          path: "/driver/profile",    color: "bg-gray-700 hover:bg-gray-600 border border-gray-600" },
          ].map(({ label, path, color, disabled }) => (
            <button
              key={path}
              onClick={() => !disabled && navigate(path)}
              disabled={disabled}
              className={`${color} text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 h-24 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Earnings"  value={fmt(analytics.totalEarnings)}     accent="border-green-500"  icon="💰" />
            <StatCard label="Total Rides"     value={String(analytics.totalRides)}      accent="border-blue-500"   icon="🚗" />
            <StatCard label="This Month"      value={fmt(analytics.thisMonthEarnings)}  accent="border-purple-500" icon="📅" />
            <StatCard label="Today"           value={fmt(analytics.todayEarnings)}      accent="border-amber-500"  icon="⚡" />
          </div>
        ) : (
          <p className="text-red-400 mb-8">Failed to load analytics</p>
        )}

        {/* ── CHART + RECENT RIDES (2-col) ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart — spans 2/3 */}
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-white font-bold text-lg">Earnings Trend</h2>
                <p className="text-gray-400 text-xs mt-0.5">Last 30 days · completed rides</p>
              </div>
              <span className="text-xs bg-green-900/50 text-green-400 border border-green-700/50 px-3 py-1 rounded-full font-medium">
                PKR {Number(analytics?.totalEarnings ?? 0).toLocaleString()}
              </span>
            </div>

            {!loading && analytics && analytics.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.dailyData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="earnings" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-gray-500 gap-2">
                <div className="text-4xl">📊</div>
                <p className="text-sm">
                  {loading ? "Loading chart…" : "No earnings data yet — complete your first ride!"}
                </p>
              </div>
            )}
          </div>

          {/* Recent rides — 1/3 */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700/50 flex flex-col">
            <h2 className="text-white font-bold text-lg mb-4">Recent Rides</h2>

            {loading ? (
              <div className="space-y-3 flex-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-700 h-16 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : analytics && analytics.recentRides.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {analytics.recentRides.map((r, i) => (
                  <div key={i} className="bg-gray-750 border border-gray-700 rounded-xl px-4 py-3 hover:bg-gray-700/60 transition-colors">
                    <p className="text-white text-sm font-semibold truncate">
                      {r.fromAddress}
                      <span className="text-gray-500 font-normal mx-1.5">→</span>
                      {r.toAddress}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-gray-500 text-xs">
                        {new Date(r.departureTime).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", month: "short", day: "numeric" })}
                        {" · "}
                        {r.passengers} pax
                      </p>
                      <p className="text-green-400 text-sm font-bold">
                        PKR {Number(r.earnings).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
                <div className="text-3xl">🏁</div>
                <p className="text-sm text-center">No completed rides yet</p>
              </div>
            )}

            <button
              onClick={() => navigate("/driver/my-rides")}
              className="mt-4 w-full py-2 text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-colors"
            >
              View All Rides →
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
