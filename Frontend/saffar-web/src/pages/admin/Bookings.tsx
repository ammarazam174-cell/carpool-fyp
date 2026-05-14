import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

type Booking = {
  id: string;
  passengerName: string;
  fromAddress: string;
  toAddress: string;
  status: string;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    Accepted:  "bg-green-900 text-green-300",
    Pending:   "bg-yellow-900 text-yellow-300",
    Rejected:  "bg-red-900 text-red-300",
    Cancelled: "bg-gray-700 text-gray-400",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status] ?? "bg-gray-700 text-gray-400"}`}>
      {status}
    </span>
  );
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/bookings")
      .then((res) => setBookings(res.data))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Booking Management</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-12 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Passenger</th>
                <th className="px-4 py-3 text-left">Ride</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Booked At</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{b.passengerName}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {b.fromAddress} <span className="text-gray-500">→</span> {b.toAddress}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(b.createdAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
