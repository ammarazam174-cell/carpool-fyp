import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken } from "firebase/messaging";
import { messaging } from "../../firebase";
import type { Ride } from "../../types/ride";

const cardStyle: React.CSSProperties = {
  border: "1px solid #374151",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
  backgroundColor: "#1f2937",  // dark card
  color: "#ffffff",            // white text
  boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
};

const badgeStyle = (status: string): React.CSSProperties => ({
  padding: "6px 14px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  color: "#fff",
  background:
    status === "Active"
      ? "linear-gradient(90deg,#22c55e,#16a34a)"
      : status === "Accepted"
        ? "linear-gradient(90deg,#22c55e,#16a34a)"
        : status === "Pending"
          ? "linear-gradient(90deg,#f59e0b,#d97706)"
          : status === "Rejected"
            ? "linear-gradient(90deg,#ef4444,#dc2626)"
            : "linear-gradient(90deg,#6b7280,#4b5563)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
});

export default function PassengerDashboard() {
  const navigate = useNavigate();

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BMj5lKJVPiXpYGZ0gHkYUcxgZPPBWkqFmdkSk4tygrJimQW7BKOJk6UmuYd_S7UWTVOMAnRoajIoMYkOMgjrekU",
      });

      console.log("FCM TOKEN:", token);

      // ✅ SAVE TOKEN IN BACKEND
      await api.post("/notifications/token", { token });
    }
  };

  useEffect(() => {
    // ✅ async wrapper (BEST PRACTICE)
    (async () => {
      await requestNotificationPermission();
    })();
  }, []);

  const [selectedPickup, setSelectedPickup] = useState<string>("");
  const [selectedDropoff, setSelectedDropoff] = useState<string>("");
  const [seats, setSeats] = useState<number>(1);
  const [pickup, setPickup] = useState("");
  const [toCity, setToCity] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);

  const searchRides = async () => {
    if (!pickup || !toCity) {
      alert("Please enter pickup location and destination city");
      return;
    }

    setLoading(true);

    try {
 const res = await api.get("/rides/search", {
  params: {
    pickup,
    toCity,
  },
});

console.log("API RESPONSE:", res.data);

setRides(res.data);
    } catch {
      alert("No rides found for this route");
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const requestBooking = async (rideId: string) => {
  if (!selectedPickup || !selectedDropoff) {
    alert("Please select pickup and dropoff stops");
    return;
  }

  try {
    await api.post("/bookings", {
      rideId: rideId,
      pickupStop: selectedPickup,
      dropoffStop: selectedDropoff,
      seats: seats
    });

    alert("Booking requested successfully");
  } catch (error: any) {
    console.log(error.response?.data);
    alert("Failed to book ride");
  }
};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f172a,#111827,#1f2937)",
        padding: "40px 20px",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
          Find Your Ride
        </h1>

        <button
          onClick={() => navigate("/passenger/bookings")}
          style={{
            marginBottom: "25px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          My Bookings
        </button>

        {/* SEARCH BOX */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "25px",
            borderRadius: "16px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            marginBottom: "30px",
          }}
        >
          <input
            placeholder="Pickup location (e.g. PECHS)"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #374151",
              backgroundColor: "#0f172a",
              color: "#fff",
              width: "100%",
              marginBottom: "15px",
            }}
          />

          <input
            placeholder="Destination city (e.g. Hyderabad)"
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #374151",
              backgroundColor: "#0f172a",
              color: "#fff",
              width: "100%",
              marginBottom: "15px",
            }}
          />

          <button
            onClick={searchRides}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(90deg,#2563eb,#4f46e5)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Searching..." : "Search Rides"}
          </button>
        </div>

        {/* RESULTS */}
        {rides.map((ride) => (
          <div
            key={ride.id}
            style={{
              ...cardStyle,
              background: "rgba(255,255,255,0.05)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "20px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
            }}
          >
            <h2 style={{ marginBottom: "6px" }}>
              {ride.fromAddress} → {ride.toAddress}
            </h2>

            <span style={badgeStyle(ride.status)}>
              {ride.status}
            </span>


            <p style={{ marginTop: "12px" }}>
              🕒 {new Date(ride.departureTime).toLocaleString()}
            </p>

            <p>💺 Seats: {ride.availableSeats}</p>
            <p>💰 PKR {ride.price}</p>
            <p>🚗 {ride.vehicleMake} {ride.vehicleModel}</p>
            <p>👤 {ride.driverName}</p>

            {/* Pickup Stop */}
            <select
              value={selectedPickup}
              onChange={(e) => setSelectedPickup(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "8px"
              }}
            >
              <option value="">Select Pickup Stop</option>
              {ride.pickupStops?.map((stop: string, index: number) => (
                <option key={index} value={stop}>
                  {stop}
                </option>
              ))}
            </select>

            {/* Dropoff Stop */}
            <select
              value={selectedDropoff}
              onChange={(e) => setSelectedDropoff(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "8px"
              }}
            >
              <option value="">Select Dropoff Stop</option>
              {ride.dropoffStops?.map((stop: string, index: number) => (
                <option key={index} value={stop}>
                  {stop}
                </option>
              ))}
            </select>

            {/* Seats */}
            <input
              type="number"
              min="1"
              max={ride.availableSeats}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "8px"
              }}
            />

            <button
              onClick={() => requestBooking(ride.id)}
              disabled={ride.availableSeats === 0 || ride.status !== "Active"}
              style={{
                marginTop: "15px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                fontWeight: 700,
                background:
                  ride.availableSeats === 0 || ride.status !== "Active"
                    ? "#374151"
                    : "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#fff",
                cursor:
                  ride.availableSeats === 0 || ride.status !== "Active"
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {ride.availableSeats === 0 ? "Ride Full" : "Request Booking"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}