import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { getToken } from "firebase/messaging";
import { messaging } from "../../firebase";
import type { Ride } from "../../types/ride";
import LocationMap from "../../components/LocationMap";
import connection, { startSignalR } from "../../services/signalr";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationState {
  lat: number;
  lng: number;
  address: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "20px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #334155",
  backgroundColor: "#0f172a",
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
  outline: "none",
  appearance: "auto",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const badgeStyle = (status: string): React.CSSProperties => ({
  padding: "4px 12px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
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
});

// ─── Component ────────────────────────────────────────────────────────────────

type VerificationProfile = { isVerified: boolean; status: string };

export default function PassengerDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<VerificationProfile | null>(null);

  // Search state
  const [pickup, setPickup] = useState("");
  const [toCity, setToCity] = useState("");
  const [cityError, setCityError] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);

  // Per-ride booking state
  const [bookingData, setBookingData] = useState<{ [rideId: string]: any }>({});

  // Location state
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  useEffect(() => {
    api.get("/profile/me")
      .then(res => setProfile({ isVerified: res.data.isVerified, status: res.data.status }))
      .catch(() => {});
  }, []);

  // ── Load all rides on mount ───────────────────────────────────────────────
  useEffect(() => {
    const loadAllRides = async () => {
      setLoading(true);
      try {
        const res = await api.get("/rides");
        setRides(res.data);
      } catch {
        // silently ignore — user can still search manually
      } finally {
        setLoading(false);
      }
    };
    loadAllRides();
  }, []);

  // ── Auto-search when both cities are selected ─────────────────────────────
  useEffect(() => {
    if (!pickup || !toCity || pickup === toCity) return;
    setCityError("");
    setLoading(true);
    api.get("/rides/search", { params: { pickup, toCity } })
      .then((res) => setRides(res.data))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [pickup, toCity]);

  // ── SignalR — real-time booking status + seat count updates ──────────────────
  useEffect(() => {
    startSignalR();

    const onBookingUpdated = (data: { bookingId: string; rideId: string; status: string }) => {
      setRides((prev) =>
        prev.map((r) => {
          if (r.id !== data.rideId) return r;
          const newStatus = data.status as Ride["bookingStatus"];
          if (newStatus === "Accepted")  toast.success("🎉 Booking accepted by driver!");
          if (newStatus === "Rejected")  toast.error("❌ Driver rejected your booking");
          if (newStatus === "Cancelled") toast("Your booking was cancelled");
          return { ...r, bookingStatus: newStatus, hasRequested: newStatus !== "Cancelled" && newStatus !== "Rejected" };
        })
      );
    };

    const onSeatsUpdated = (data: { rideId: string; availableSeats: number; totalSeats: number }) => {
      setRides((prev) =>
        prev.map((r) =>
          r.id === data.rideId
            ? { ...r, availableSeats: data.availableSeats, totalSeats: data.totalSeats }
            : r
        )
      );
    };

    connection.on("BookingUpdated",   onBookingUpdated);
    connection.on("RideSeatsUpdated", onSeatsUpdated);
    return () => {
      connection.off("BookingUpdated",   onBookingUpdated);
      connection.off("RideSeatsUpdated", onSeatsUpdated);
    };
  }, []);

  // ── Firebase notification setup ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(messaging, {
            vapidKey: "BMj5lKJVPiXpYGZ0gHkYUcxgZPPBWkqFmdkSk4tygrJimQW7BKOJk6UmuYd_S7UWTVOMAnRoajIoMYkOMgjrekU",
          });
          await api.post("/notifications/token", { token });
        }
      } catch {
        // Notifications are optional — swallow silently
      }
    })();
  }, []);

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const resolveAddress = async (lat: number, lng: number): Promise<string> => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`;
    console.log("[Geocode] Requesting:", url);
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log("[Geocode] Response:", data);
      if (data.status !== "OK") {
        console.warn("[Geocode] Non-OK status:", data.status, data.error_message);
      }
      return data.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (err) {
      console.error("[Geocode] Fetch failed:", err);
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const getCurrentLocation = () => {
    console.log("[Geolocation] navigator.geolocation available:", !!navigator.geolocation);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");

    console.log("[Geolocation] Attempt 1: network-based (enableHighAccuracy: false)");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        console.log("[Geolocation] Attempt 1 SUCCESS:", {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        });
        const address = await resolveAddress(coords.latitude, coords.longitude);
        setLocation({ lat: coords.latitude, lng: coords.longitude, address });
        setLocationLoading(false);
      },
      (err) => {
        console.warn("[Geolocation] Attempt 1 FAILED:", {
          code: err.code,
          message: err.message,
          PERMISSION_DENIED: err.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
          TIMEOUT: err.TIMEOUT,
        });

        if (err.code !== err.PERMISSION_DENIED) {
          console.log("[Geolocation] Attempt 2: GPS-based (enableHighAccuracy: true)");
          navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
              console.log("[Geolocation] Attempt 2 SUCCESS:", {
                lat: coords.latitude,
                lng: coords.longitude,
                accuracy: coords.accuracy,
              });
              const address = await resolveAddress(coords.latitude, coords.longitude);
              setLocation({ lat: coords.latitude, lng: coords.longitude, address });
              setLocationLoading(false);
            },
            (err2) => {
              console.error("[Geolocation] Attempt 2 FAILED:", {
                code: err2.code,
                message: err2.message,
              });
              setLocationLoading(false);
              setLocationError(
                err2.code === err2.PERMISSION_DENIED
                  ? "Location permission denied. Enter your address manually below."
                  : "Could not detect location. Please enter your address manually below."
              );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        } else {
          setLocationLoading(false);
          setLocationError("Location permission denied. Enter your address manually below.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const applyManualAddress = () => {
    if (!manualAddress.trim()) return;
    setLocation({ lat: 0, lng: 0, address: manualAddress.trim() });
    setLocationError("");
  };

  // ── Manual search / refresh ───────────────────────────────────────────────
  const searchRides = async () => {
    if (pickup && toCity && pickup === toCity) {
      setCityError("From City and To City cannot be the same.");
      return;
    }
    setCityError("");
    setLoading(true);
    try {
      const endpoint = pickup && toCity
        ? "/rides/search"
        : "/rides";
      const params = pickup && toCity ? { pickup, toCity } : {};
      const res = await api.get(endpoint, { params });
      setRides(res.data);
    } catch {
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Preview modal state ───────────────────────────────────────────────────────
  const [previewRideId, setPreviewRideId] = useState<string | null>(null);

  // ── Open preview (validates before showing modal) ─────────────────────────────
  const openPreview = (rideId: string) => {
    if (!profile?.isVerified) {
      alert("Your profile must be approved by admin before you can book rides.");
      return;
    }
    const data = bookingData[rideId];
    if (!data?.pickup || !data?.dropoff) {
      alert("Please select both pickup and dropoff stops.");
      return;
    }
    if (!location) {
      alert("Please share your current location before booking.");
      return;
    }
    setPreviewRideId(rideId);
  };

  // ── Confirm booking (called from modal) ───────────────────────────────────────
  const confirmBooking = async () => {
    if (!previewRideId) return;
    await requestBooking(previewRideId);
    setPreviewRideId(null);
  };

  // ── Button config based on booking status ────────────────────────────────────
  const getButtonConfig = (ride: Ride): { text: string; disabled: boolean; bg: string; color: string; cursor: string } => {
    if (ride.status === "InProgress" && ride.bookingStatus === "Accepted") {
      return { text: "Ride Confirmed ✅", disabled: true, bg: "linear-gradient(90deg,#22c55e,#16a34a)", color: "#fff", cursor: "not-allowed" };
    }
    if (ride.status === "InProgress") {
      return { text: "🚗 Ride In Progress", disabled: true, bg: "#1e293b", color: "#475569", cursor: "not-allowed" };
    }
    if (ride.bookingStatus === "Pending") {
      return { text: "Waiting for Driver ⏳", disabled: true, bg: "linear-gradient(90deg,#f59e0b,#d97706)", color: "#fff", cursor: "not-allowed" };
    }
    if (ride.bookingStatus === "Accepted") {
      return { text: "Confirmed ✅", disabled: true, bg: "linear-gradient(90deg,#22c55e,#16a34a)", color: "#fff", cursor: "not-allowed" };
    }
    if (ride.availableSeats === 0) {
      return { text: "Ride Full 🔴", disabled: true, bg: "#1e293b", color: "#6b7280", cursor: "not-allowed" };
    }
    if (ride.bookingStatus === "Rejected" || ride.bookingStatus === "Cancelled") {
      return { text: "Request Again →", disabled: false, bg: "linear-gradient(90deg,#6366f1,#4f46e5)", color: "#fff", cursor: "pointer" };
    }
    return { text: "Request Booking", disabled: false, bg: "linear-gradient(90deg,#22c55e,#16a34a)", color: "#fff", cursor: "pointer" };
  };

  // ── Request booking (pure API call — validation lives in openPreview) ─────────
  const requestBooking = async (rideId: string) => {
    const data = bookingData[rideId];
    const seatsRequested = data?.seats || 1;
    try {
      await api.post("/bookings", {
        rideId,
        pickupStop: data.pickup,
        dropoffStop: data.dropoff,
        seats: seatsRequested,
        passengerLatitude: location!.lat !== 0 ? location!.lat : null,
        passengerLongitude: location!.lng !== 0 ? location!.lng : null,
        passengerAddress: location!.address,
      });
      // Optimistic update
      setRides((prev) =>
        prev.map((r) =>
          r.id === rideId
            ? { ...r, hasRequested: true, bookingStatus: "Pending", availableSeats: Math.max(0, r.availableSeats - seatsRequested) }
            : r
        )
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.response?.data ?? "Something went wrong";
      alert(`Booking failed: ${msg}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

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

        {/* ── Header ── */}
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
          Find Your Ride
        </h1>

        {/* ── Nav buttons ── */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <button
            onClick={() => navigate("/passenger/bookings")}
            style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            My Bookings
          </button>
          <button
            onClick={() => navigate("/passenger/my-profile")}
            style={{ padding: "8px 18px", borderRadius: "8px", border: "none", backgroundColor: "#4f46e5", color: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            My Profile
          </button>
        </div>

        {/* VERIFICATION BANNER */}
        {profile && !profile.isVerified && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-5 border text-sm ${
            profile.status === "Rejected"
              ? "bg-red-950 border-red-700 text-red-300"
              : "bg-amber-950 border-amber-700 text-amber-300"
          }`}>
            <span className="text-lg mt-0.5">{profile.status === "Rejected" ? "❌" : "🕐"}</span>
            <div>
              <p className="font-semibold">
                {profile.status === "Rejected" ? "Profile Rejected" : "Verification Pending"}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {profile.status === "Rejected"
                  ? "Your documents were rejected. Please contact support."
                  : "Your profile is under admin review. You cannot book rides until approved."}
              </p>
            </div>
          </div>
        )}

        {/* ── Search box ── */}
        <div style={{ ...card, marginBottom: "20px" }}>

          {/* From City */}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>From City</label>
            <select
              value={pickup}
              onChange={(e) => { setPickup(e.target.value); setCityError(""); }}
              style={selectStyle}
            >
              <option value="">Select From City</option>
              <option value="Karachi">Karachi</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* To City */}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>To City</label>
            <select
              value={toCity}
              onChange={(e) => { setToCity(e.target.value); setCityError(""); }}
              style={selectStyle}
            >
              <option value="">Select To City</option>
              <option value="Karachi" disabled={pickup === "Karachi"}>Karachi</option>
              <option value="Hyderabad" disabled={pickup === "Hyderabad"}>Hyderabad</option>
            </select>
          </div>

          {/* Validation error */}
          {cityError && (
            <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "10px" }}>
              ⚠ {cityError}
            </p>
          )}

          <button
            onClick={searchRides}
            style={{
              width: "100%", padding: "12px", borderRadius: "10px", border: "none",
              background: "linear-gradient(90deg,#2563eb,#4f46e5)",
              color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "15px",
            }}
          >
            {loading ? "Searching..." : "Search Rides"}
          </button>
        </div>

        {/* ── Current Location card (shown when rides exist) ── */}
        {rides.length > 0 && (
          <div style={{ ...card, border: location ? "1px solid #1d4ed8" : "1px solid #334155" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: "#93c5fd" }}>
              📍 Your Current Location
              <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>
                (required to book)
              </span>
            </p>

            {/* Detect button */}
            {!location && (
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 20px", borderRadius: "8px", border: "none",
                  background: locationLoading ? "#1e293b" : "linear-gradient(90deg,#0ea5e9,#2563eb)",
                  color: "#fff", fontWeight: 600, cursor: locationLoading ? "not-allowed" : "pointer",
                  fontSize: "14px", marginBottom: "12px",
                }}
              >
                {locationLoading ? (
                  <>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Detecting...
                  </>
                ) : "📍 Use Current Location"}
              </button>
            )}

            {/* Error + manual input */}
            {locationError && (
              <div style={{ marginBottom: "12px" }}>
                <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>
                  ⚠ {locationError}
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    placeholder="Enter your address manually"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyManualAddress()}
                    style={{ ...selectStyle, flex: 1, cursor: "text", border: "1px solid #475569" }}
                  />
                  <button
                    onClick={applyManualAddress}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Set
                  </button>
                </div>
              </div>
            )}

            {/* Location confirmed */}
            {location && (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>📍</span>
                    <span style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: "1.5" }}>
                      {location.address}
                    </span>
                  </div>
                  <button
                    onClick={() => { setLocation(null); setManualAddress(""); setLocationError(""); }}
                    style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                  >
                    Change
                  </button>
                </div>

                {/* Map preview — only for GPS locations */}
                {location.lat !== 0 && location.lng !== 0 && (
                  <LocationMap lat={location.lat} lng={location.lng} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
            <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid #1e293b", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: "12px" }} />
            <p style={{ margin: 0, fontSize: "14px" }}>Searching for rides…</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && (pickup || toCity) && rides.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🚗</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>No rides found</p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              No active rides match{" "}
              {pickup && toCity ? `${pickup} → ${toCity}` : pickup || toCity}.
              Try a different route or check back later.
            </p>
          </div>
        )}

        {!loading && !pickup && !toCity && rides.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🔍</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>Select a route to find rides</p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Choose a From City and To City, then click Search Rides.
            </p>
          </div>
        )}

        {/* ── Ride cards ── */}
        {rides.map((ride) => (
          <div key={ride.id} style={card}>

            {/* Route + badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
                {ride.fromAddress} → {ride.toAddress}
              </h2>
              <span style={badgeStyle(ride.status)}>{ride.status}</span>
            </div>

            {/* Ride details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "14px", color: "#cbd5e1", marginBottom: "16px" }}>
              <p style={{ margin: 0 }}>🕒 {new Date(ride.departureTime).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}</p>
              <p style={{ margin: 0 }}>
                {ride.availableSeats === 0
                  ? "🔴 Ride Full"
                  : ride.availableSeats === 1
                    ? "🔥 Only 1 seat left"
                    : `💺 ${ride.availableSeats}/${ride.totalSeats} seats left`}
              </p>
              <p style={{ margin: 0 }}>💰 PKR {ride.price}</p>
              <p style={{ margin: 0 }}>🚗 {ride.vehicleMake} {ride.vehicleModel}</p>
              <p style={{ margin: 0, gridColumn: "1/-1" }}>👤 {ride.driverName}</p>
            </div>

            {/* Booking selects */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Pickup */}
              <div>
                <label style={labelStyle}>📍 Pickup Stop</label>
                <select
                  value={bookingData[ride.id]?.pickup || ""}
                  onChange={(e) => setBookingData({ ...bookingData, [ride.id]: { ...bookingData[ride.id], pickup: e.target.value } })}
                  style={selectStyle}
                >
                  <option value="">Select Pickup Stop</option>
                  {ride.pickupStops?.map((stop: string, i: number) => (
                    <option key={i} value={stop}>{stop}</option>
                  ))}
                </select>
              </div>

              {/* Dropoff */}
              <div>
                <label style={labelStyle}>🏁 Dropoff Stop</label>
                <select
                  value={bookingData[ride.id]?.dropoff || ""}
                  onChange={(e) => setBookingData({ ...bookingData, [ride.id]: { ...bookingData[ride.id], dropoff: e.target.value } })}
                  style={selectStyle}
                >
                  <option value="">Select Dropoff Stop</option>
                  {ride.dropoffStops?.map((stop: string, i: number) => (
                    <option key={i} value={stop}>{stop}</option>
                  ))}
                </select>
              </div>

              {/* Seats — dynamic based on what's actually available */}
              <div>
                <label style={labelStyle}>💺 Number of Seats</label>
                {ride.availableSeats === 0 ? (
                  <p style={{ color: "#ef4444", fontSize: "13px", margin: 0, padding: "10px 0" }}>
                    No seats available
                  </p>
                ) : (
                  <select
                    value={bookingData[ride.id]?.seats || 1}
                    onChange={(e) => setBookingData({ ...bookingData, [ride.id]: { ...bookingData[ride.id], seats: Number(e.target.value) } })}
                    style={selectStyle}
                  >
                    {Array.from({ length: Math.min(ride.availableSeats, 4) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} Seat{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                )}
              </div>

            </div>

            {/* Live fare display */}
            {ride.availableSeats > 0 && !ride.bookingStatus && (
              <div style={{
                marginTop: "14px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                  PKR {ride.price.toLocaleString()} × {bookingData[ride.id]?.seats || 1} seat{(bookingData[ride.id]?.seats || 1) > 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#4ade80" }}>
                  Total: PKR {((bookingData[ride.id]?.seats || 1) * ride.price).toLocaleString()}
                </span>
              </div>
            )}

            {/* Book button */}
            {(() => {
              const btn = getButtonConfig(ride);
              return (
                <button
                  onClick={() => !btn.disabled && openPreview(ride.id)}
                  disabled={btn.disabled}
                  style={{
                    marginTop: "16px", width: "100%", padding: "13px",
                    borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "15px",
                    background: btn.bg,
                    color: btn.color,
                    cursor: btn.cursor,
                  }}
                >
                  {btn.text}
                </button>
              );
            })()}

          </div>
        ))}

      </div>

      {/* ── Booking Preview Modal ─────────────────────────────────────────────── */}
      {previewRideId && (() => {
        const r = rides.find((x) => x.id === previewRideId);
        if (!r) return null;
        const bd   = bookingData[previewRideId] || {};
        const seats = bd.seats || 1;
        const total = seats * r.price;

        return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}
            onClick={(e) => e.target === e.currentTarget && setPreviewRideId(null)}
          >
            <div style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "440px",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            }}>

              {/* Modal header */}
              <div style={{
                background: "linear-gradient(135deg,#1e40af,#4f46e5)",
                padding: "20px 24px",
              }}>
                <p style={{ margin: 0, fontSize: "11px", color: "#bfdbfe", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Review your booking
                </p>
                <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                  Confirm Booking
                </h2>
              </div>

              <div style={{ padding: "24px" }}>

                {/* Route */}
                <div style={{
                  background: "#1e293b", borderRadius: "12px",
                  padding: "14px 18px", marginBottom: "16px",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>From</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#f1f5f9" }}>{r.fromAddress}</p>
                  </div>
                  <span style={{ color: "#475569", fontSize: "20px" }}>→</span>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>To</p>
                    <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#f1f5f9" }}>{r.toAddress}</p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { icon: "📍", label: "Pickup Stop",    value: bd.pickup  || "—" },
                    { icon: "🏁", label: "Dropoff Stop",   value: bd.dropoff || "—" },
                    { icon: "👤", label: "Driver",         value: r.driverName },
                    { icon: "🕒", label: "Departure",      value: new Date(r.departureTime).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) },
                    { icon: "🪑", label: "Seats",          value: `${seats} seat${seats > 1 ? "s" : ""}` },
                    { icon: "💰", label: "Price per seat", value: `PKR ${r.price.toLocaleString()}` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{icon} {label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Total fare banner */}
                <div style={{
                  background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.08))",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6ee7b7", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Total Fare
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#475569" }}>
                      PKR {r.price.toLocaleString()} × {seats}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#4ade80" }}>
                    PKR {total.toLocaleString()}
                  </p>
                </div>

                {/* Buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    onClick={() => setPreviewRideId(null)}
                    style={{
                      padding: "13px", borderRadius: "12px",
                      border: "1px solid #334155", background: "transparent",
                      color: "#94a3b8", fontWeight: 600, fontSize: "14px", cursor: "pointer",
                    }}
                  >
                    ← Go Back
                  </button>
                  <button
                    onClick={confirmBooking}
                    style={{
                      padding: "13px", borderRadius: "12px", border: "none",
                      background: "linear-gradient(135deg,#22c55e,#16a34a)",
                      color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer",
                    }}
                  >
                    Confirm Booking ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
