import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

type Ride = {
  id: string;
  driverName: string;
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  status: string;
};

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    Active:    "bg-green-900 text-green-300",
    Completed: "bg-blue-900 text-blue-300",
    Cancelled: "bg-gray-700 text-gray-400",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status] ?? "bg-gray-700 text-gray-400"}`}>
      {status}
    </span>
  );
}

export default function Rides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get("/admin/rides")
      .then((res) => setRides(res.data))
      .catch(() => toast.error("Failed to load rides"))
      .finally(() => setLoading(false));
  }, []);

  const deleteRide = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/rides/${confirmId}`);
      toast.success("Ride deleted");
      setRides((prev) => prev.filter((r) => r.id !== confirmId));
    } catch {
      toast.error("Failed to delete ride");
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Ride Management</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 h-12 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No rides found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Date / Time</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Fare</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{r.driverName}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {r.fromAddress} <span className="text-gray-500">→</span> {r.toAddress}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.departureTime).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">{r.availableSeats}</td>
                  <td className="px-4 py-3">Rs {r.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmId(r.id)}
                      className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">Delete Ride?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete the ride and all its bookings. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteRide}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
