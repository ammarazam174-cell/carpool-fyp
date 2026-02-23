import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
type Booking = {
  id: string;
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled";
  createdAt: string;
  ride: {
    fromAddress: string;
    toAddress: string;
    departureTime: string;
    price: number;
  };
};
const badgeStyle = (status: string): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor:
    status === "Accepted"
      ? "#22c55e"
      : status === "Pending"
        ? "#f59e0b"
        : status === "Rejected"
          ? "#ef4444"
          : "#6b7280",
});
export default function PassengerMyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const previousBookings = useRef<any[]>([]);

  const loadBookings = async (status?: string) => {
    try {
      const res = await api.get("/bookings/my", {
        params: status ? { status } : {},
      });

      // 🔔 STATUS CHANGE TOAST
      res.data.forEach((newBooking: any) => {
        const oldBooking = previousBookings.current.find(
          (b) => b.id === newBooking.id
        );

        if (oldBooking && oldBooking.status !== newBooking.status) {
          if (newBooking.status === "Accepted") {
            toast.success("🎉 Your booking was ACCEPTED!");
          }
          if (newBooking.status === "Rejected") {
            toast.error("❌ Your booking was REJECTED");
          }
          if (newBooking.status === "Cancelled") {
            toast("🚫 Ride was cancelled by driver");
          }
        }
      });

      previousBookings.current = res.data;
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ONLY ONE useEffect
  useEffect(() => {
    loadBookings(statusFilter);

    const interval = setInterval(() => {
      loadBookings(statusFilter);
    }, 5000);

    return () => clearInterval(interval);
  }, [statusFilter]);

  const cancelBooking = async (bookingId: string) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking?"
    );
    if (!confirmCancel) return;

    try {
      await api.put(`/bookings/${bookingId}/cancel`);
      loadBookings(statusFilter);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking");
    }
  };

  // ✅ AFTER ALL HOOKS
  if (loading) {
    return <p style={{ padding: "20px" }}>Loading your bookings...</p>;
  }

  if (bookings.length === 0) {
    return <p style={{ padding: "20px" }}>You have no bookings yet.</p>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "720px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setStatusFilter(undefined)}>All</button>
        <button onClick={() => setStatusFilter("Pending")}>Pending</button>
        <button onClick={() => setStatusFilter("Accepted")}>Accepted</button>
        <button onClick={() => setStatusFilter("Rejected")}>Rejected</button>
        <button onClick={() => setStatusFilter("Cancelled")}>Cancelled</button>
      </div>

      <h2>My Bookings</h2>

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

          <p>🕒 {new Date(b.ride.departureTime).toLocaleString()}</p>

          <p>💵 PKR {b.ride.price}</p>

          <div style={{ marginBottom: "8px" }}>
            <span style={badgeStyle(b.status)}>{b.status}</span>
          </div>

          <p>📅 Booked at: {new Date(b.createdAt).toLocaleString()}</p>

          {b.status === "Accepted" && (
            <button
              onClick={() => cancelBooking(b.id)}
              style={{
                marginTop: "10px",
                backgroundColor: "#ef4444",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                cursor: "pointer",
                borderRadius: "6px",
                fontWeight: 600,
              }}
            >
              Cancel Booking
            </button>
          )}
        </div>
      ))}
    </div>
  );
}