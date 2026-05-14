import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

type Stats = {
  totalUsers: number;
  totalDrivers: number;
  totalPassengers: number;
  totalRides: number;
  totalBookings: number;
  totalEarnings: number;
};

const CARDS: { key: keyof Stats; label: string; color: string }[] = [
  { key: "totalUsers",      label: "Total Users",      color: "border-blue-500"   },
  { key: "totalDrivers",    label: "Total Drivers",    color: "border-green-500"  },
  { key: "totalPassengers", label: "Total Passengers", color: "border-purple-500" },
  { key: "totalRides",      label: "Total Rides",      color: "border-yellow-500" },
  { key: "totalBookings",   label: "Total Bookings",   color: "border-pink-500"   },
  { key: "totalEarnings",   label: "Total Earnings",   color: "border-teal-500"   },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/dashboard-stats")
      .then((res) => setStats(res.data))
      .catch(() => toast.error("Failed to load dashboard stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-28 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-red-400">Could not load dashboard stats.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {CARDS.map(({ key, label, color }) => (
          <div
            key={key}
            className={`bg-gray-800 rounded-2xl p-6 border-l-4 ${color} shadow-lg`}
          >
            <p className="text-gray-400 text-sm mb-2">{label}</p>
            <p className="text-3xl font-bold text-white">
              {key === "totalEarnings"
                ? `Rs ${stats[key].toLocaleString()}`
                : stats[key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
