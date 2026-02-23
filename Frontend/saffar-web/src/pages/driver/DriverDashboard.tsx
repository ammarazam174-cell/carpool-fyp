import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getDriverEarnings } from "../../services/earningsService";

interface DriverEarnings {
  totalEarnings: number;
  totalAcceptedRides: number;
  monthlyEarnings: number;
}

type Booking = {
  id: string;
  status: string;
  passenger: {
    id: string;
    phoneNumber: string;
  };
  ride: {
    id: string;
    fromAddress: string;
    toAddress: string;
    departureTime: string;
    price: number; // ✅ ADD THIS LINE
  };
};

const badgeStyle = (status: string): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor:
    status === "Pending"
      ? "#f59e0b"
      : status === "Accepted"
        ? "#22c55e"
        : "#ef4444",
});
const acceptBtn: React.CSSProperties = {
  backgroundColor: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "6px 14px",
  borderRadius: "6px",
  cursor: "pointer",
};

const rejectBtn: React.CSSProperties = {
  backgroundColor: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "6px 14px",
  borderRadius: "6px",
  cursor: "pointer",
};

export default function DriverDashboard() {
  const navigate = useNavigate(); // ✅ hook yahan

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [earnings, setEarnings] = useState<DriverEarnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

  const driverId = localStorage.getItem("userId"); // temp (JWT based later)

  const fetchBookings = async () => {
    if (!driverId) return;

    try {
      const res = await api.get(`/bookings/driver/${driverId}`);
      setBookings(res.data);
    } catch {
      alert("Failed to load booking requests");
    }
  };

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const data = await getDriverEarnings();
        console.log("EARNINGS DATA:", data);
        setEarnings(data);
      } catch (err) {
        console.error("Failed to fetch earnings", err);
      } finally {
        setEarningsLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  useEffect(() => {
    api.get("/vehicle/my")
      .then(res => {
        if (res.data.length === 0) {
          navigate("/driver/add-vehicle");
        }
      })
      .catch(() => {
        navigate("/driver/add-vehicle");
      });
  }, []);

  useEffect(() => {
    fetchBookings();
  }, []);

  const acceptBooking = async (bookingId: string) => {
    try {
      await api.put(`/bookings/${bookingId}/accept`);
      fetchBookings();
    } catch {
      alert("Failed to accept booking");
    }
  };

  const rejectBooking = async (bookingId: string) => {
    try {
      await api.put(`/bookings/${bookingId}/reject`);
      fetchBookings();
    } catch {
      alert("Failed to reject booking");
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>

      {/* TOP ACTION BUTTONS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/driver/create-ride")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ➕ Create Ride
        </button>

        <button
          onClick={() => navigate("/driver/my-rides")}
          style={{
            padding: "10px 16px",
            background: "#059669",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🚗 My Rides
        </button>

        <button
          onClick={() => navigate("/driver/bookings")}
          style={{
            padding: "10px 16px",
            background: "#7c3aed",
            color: "#fff",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          📋 Booking Requests
        </button>

        <button
          onClick={() => navigate("/driver/profile")}
          style={{
            backgroundColor: "#111827",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #374151",
            cursor: "pointer",
          }}
        >
          👤 My Profile
        </button>

      </div>

      {/* 👇 REST OF YOUR DASHBOARD (earnings, bookings etc.) */}
      {/* earnings cards */}
      {/* booking list */}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-10 px-6">
        <div className="max-w-6xl mx-auto">

          <h1 className="text-4xl font-bold text-white mb-10">
            Driver Dashboard
          </h1>

          {/* Earnings Cards */}
          {earningsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gray-700 h-28 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : earnings ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">

              <div className="bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl p-6 border-l-4 border-green-500 hover:scale-105 transition-transform duration-300">
                <p className="text-gray-300 text-sm mb-2">Total Earnings</p>
                <h2 className="text-3xl font-bold text-green-400">
                  Rs {earnings.totalEarnings}
                </h2>
              </div>

              <div className="bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl p-6 border-l-4 border-blue-500 hover:scale-105 transition-transform duration-300">
                <p className="text-gray-300 text-sm mb-2">Accepted Rides</p>
                <h2 className="text-3xl font-bold text-blue-400">
                  {earnings.totalAcceptedRides}
                </h2>
              </div>

              <div className="bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl p-6 border-l-4 border-purple-500 hover:scale-105 transition-transform duration-300">
                <p className="text-gray-300 text-sm mb-2">This Month</p>
                <h2 className="text-3xl font-bold text-purple-400">
                  Rs {earnings.monthlyEarnings}
                </h2>
              </div>

            </div>
          ) : (
            <p className="text-red-400">Failed to load earnings</p>
          )}

        </div>
      </div>

      {/* Driver Bookings */}
      < h2 className="text-xl font-semibold mb-4" > Booking Requests</h2 >

      {
        bookings.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid #ddd",
              padding: "12px",
              marginBottom: "10px",
            }}
          >
            <p>
              <b>Passenger:</b> {b.passenger.phoneNumber}
            </p>

            <span style={badgeStyle(b.status)}>{b.status}</span>

            {b.status === "Pending" && (
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => acceptBooking(b.id)}
                  style={acceptBtn}
                >
                  Accept
                </button>

                <button
                  onClick={() => rejectBooking(b.id)}
                  style={rejectBtn}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      }
    </div >
  );
}