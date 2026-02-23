import { useEffect, useState } from "react";
import api from "../../api/axios";

type Booking = {
  id: string;
  status: string;

  pickupStop: string;     // ✅ ADD
  dropoffStop: string;    // ✅ ADD

  ride: {
    fromAddress: string;
    toAddress: string;
    departureTime: string;
  };

  passenger?: {
    fullName: string;
    phoneNumber: string;
  };
};

export default function DriverBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await api.get("/bookings/driver/my");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load booking requests");
    } finally {
      setLoading(false);
    }
  };

  const acceptBooking = async (id: string) => {
    try {
      await api.put(`/bookings/${id}/accept`);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "Accepted" } : b
        )
      );
    } catch {
      alert("Failed to accept booking");
    }
  };

  const rejectBooking = async (id: string) => {
    try {
      await api.put(`/bookings/${id}/reject`);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "Rejected" } : b
        )
      );
    } catch {
      alert("Failed to reject booking");
    }
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading booking requests...</p>;

  if (bookings.length === 0)
    return <p style={{ padding: "20px" }}>No booking requests yet.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Booking Requests</h2>

      {bookings.map((b) => (
        <div
          key={b.id}
          style={{
            border: "1px solid #ddd",
            padding: "14px",
            marginBottom: "12px",
            borderRadius: "6px",
          }}
        >
          <h4>
            {b.ride.fromAddress} → {b.ride.toAddress}
          </h4>

          <p><strong>Pickup:</strong> {b.pickupStop}</p>
          <p><strong>Drop:</strong> {b.dropoffStop}</p>

          <p>
            🕒 {new Date(b.ride.departureTime).toLocaleString()}
          </p>

          <p>
            👤 Passenger: <b>{b.passenger?.fullName || "Unknown Passenger"}</b>
          </p>

          <p>
            📞 {b.passenger?.phoneNumber || ""}
          </p>

          <p>
            Status:{" "}
            <b
              style={{
                color:
                  b.status === "Accepted"
                    ? "green"
                    : b.status === "Rejected"
                    ? "red"
                    : b.status === "Cancelled"
                    ? "gray"
                    : "orange",
              }}
            >
              {b.status}
            </b>
          </p>

          {b.status === "Pending" && (
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={() => acceptBooking(b.id)}
                style={{
                  marginRight: "10px",
                  backgroundColor: "green",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Accept
              </button>

              <button
                onClick={() => rejectBooking(b.id)}
                style={{
                  backgroundColor: "red",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
