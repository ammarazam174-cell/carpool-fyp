import { useEffect, useState } from "react";
import api from "../../api/axios";
import { updateRide } from "../../api/api";

type Ride = {
  id: string;
  fromAddress: string;
  toAddress: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  status: "Active" | "Cancelled";
};

export default function DriverMyRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyRides = async () => {
    try {
      const res = await api.get("/rides/my");
      setRides(res.data);
    } catch {
      alert("Failed to load your rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyRides();
  }, []);

  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    departureTime: "",
    price: 0,
    availableSeats: 0,
  });
  const handleEdit = (ride: any) => {
    setEditingRideId(ride.id);

    setEditData({
      departureTime: ride.departureTime,
      price: ride.price,
      availableSeats: ride.availableSeats,
    });
  };

  const handleUpdateRide = async () => {
    if (!editingRideId) return;

    try {
      await updateRide(editingRideId, editData);
      alert("Ride updated successfully");

      setEditingRideId(null);
      loadMyRides(); // better than reload
    } catch (error) {
      alert("Update failed");
    }
  };
  const cancelRide = async (rideId: string) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this ride? All bookings will be cancelled."
    );

    if (!confirmCancel) return;

    try {
      await api.put(`/rides/${rideId}/cancel`);

      setRides((prev) =>
        prev.map((r) =>
          r.id === rideId ? { ...r, status: "Cancelled" } : r
        )
      );
    } catch {
      alert("Failed to cancel ride");
    }
  };

  const completeRide = async (id: string) => {
  try {
    await api.put(`/Rides/${id}/complete`);
    alert("Ride completed!");
    loadMyRides();
  } catch {
    alert("Failed to complete ride");
  }
};

  if (loading) return <p style={{ padding: "20px" }}>Loading your rides...</p>;

  if (rides.length === 0)
    return <p style={{ padding: "20px" }}>No rides created yet.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>My Rides</h2>

      {rides.map((ride) => (
        <div
          key={ride.id}
          style={{
            border: "1px solid #ccc",
            padding: "14px",
            marginBottom: "12px",
            borderRadius: "6px",
            opacity: ride.status === "Cancelled" ? 0.6 : 1,
          }}
        >
          <h4>
            {ride.fromAddress} → {ride.toAddress}
          </h4>

          <p>🕒 {new Date(ride.departureTime).toLocaleString()}</p>
          <p>🪑 Seats: {ride.availableSeats}</p>
          <p>💵 PKR {ride.price}</p>

          <p>
            <b>Status:</b>{" "}
            <span
              style={{
                color:
                  ride.status === "Cancelled"
                    ? "red"
                    : ride.availableSeats === 0
                      ? "orange"
                      : "green",
                fontWeight: "bold",
              }}
            >
              {ride.status === "Cancelled"
                ? "Cancelled"
                : ride.availableSeats === 0
                  ? "Full"
                  : "Active"}
            </span>
          </p>
          {ride.status === "Active" && (
            <button
              onClick={() => cancelRide(ride.id)}
              style={{
                backgroundColor: "#ff4d4f",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Cancel Ride
            </button>
          )}
          <button
            onClick={() => handleEdit(ride)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Edit Ride
          </button>
          <button
                onClick={() => completeRide(ride.id)}
              >
                Complete Ride
              </button>
        </div>
      ))}
      {editingRideId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="text-xl font-bold mb-4">Edit Ride</h2>

            <label className="block text-sm mb-1">Departure Time</label>
            <input
              type="datetime-local"
              value={editData.departureTime}
              onChange={(e) =>
                setEditData({ ...editData, departureTime: e.target.value })
              }
              className="w-full border p-2 mb-3 rounded"
            />

            <label className="block text-sm mb-1">Price</label>
            <input
              type="number"
              value={editData.price}
              onChange={(e) =>
                setEditData({ ...editData, price: Number(e.target.value) })
              }
              className="w-full border p-2 mb-3 rounded"
            />

            <label className="block text-sm mb-1">Available Seats</label>
            <input
              type="number"
              value={editData.availableSeats}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  availableSeats: Number(e.target.value),
                })
              }
              className="w-full border p-2 mb-4 rounded"
            />

            <div className="flex justify-between">
              <button
                onClick={() => setEditingRideId(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateRide}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}