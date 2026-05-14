import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type Passenger = {
  id: string;
  fullName: string;
  phoneNumber: string;
  seatsBooked: number;
  pickupStop: string | null;
  passengerAddress: string | null;
  totalPrice: number;
};

type Ride = {
  id: string;
  fromAddress: string;
  toAddress: string;
  pickupLocation: string | null;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: "Active" | "InProgress" | "Completed" | "Cancelled";
  driverLat: number | null;
  driverLng: number | null;
  acceptedCount: number;
  passengers: Passenger[];
};

const STATUS_CONFIG: Record<string, { label: string; bar: string; badge: string; badgeText: string }> = {
  Active:     { label: "Active",      bar: "bg-blue-500",  badge: "bg-blue-100 text-blue-700",   badgeText: "text-blue-700"  },
  InProgress: { label: "In Progress", bar: "bg-green-500", badge: "bg-green-100 text-green-700", badgeText: "text-green-700" },
  Completed:  { label: "Completed",   bar: "bg-gray-400",  badge: "bg-gray-100 text-gray-600",   badgeText: "text-gray-600"  },
  Cancelled:  { label: "Cancelled",   bar: "bg-red-400",   badge: "bg-red-100 text-red-700",     badgeText: "text-red-700"   },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DriverMyRides() {
  const [rides, setRides]         = useState<Ride[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData]   = useState({ departureTime: "", availableSeats: 0 });
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  const [trackingRideId, setTrackingRideId] = useState<string | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMyRides();
    return () => stopTracking();
  }, []);

  const loadMyRides = async () => {
    try {
      const res = await api.get("/rides/my");
      setRides(res.data);
      const inProgress = res.data.find((r: Ride) => r.status === "InProgress");
      if (inProgress && !trackingRideId) beginTracking(inProgress.id);
    } catch {
      toast.error("Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  // ── Live location ─────────────────────────────────────────────────────────

  const sendLocation = (rideId: string) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.put(`/rides/${rideId}/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        } catch { /* silent — retry next interval */ }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const beginTracking = (rideId: string) => {
    setTrackingRideId(rideId);
    sendLocation(rideId);
    locationIntervalRef.current = setInterval(() => sendLocation(rideId), 7000);
  };

  const stopTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setTrackingRideId(null);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const startRide = async (rideId: string) => {
    try {
      await api.put(`/rides/${rideId}/start`);
      setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status: "InProgress" } : r));
      beginTracking(rideId);
      toast.success("Ride started — sharing your live location");
    } catch (err: any) {
      toast.error(err?.response?.data ?? "Failed to start ride");
    }
  };

  const completeRide = async (rideId: string) => {
    if (!window.confirm("Mark this ride as completed?")) return;
    try {
      await api.put(`/rides/${rideId}/complete`);
      setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status: "Completed" } : r));
      if (trackingRideId === rideId) stopTracking();
      toast.success("Ride completed!");
    } catch {
      toast.error("Failed to complete ride");
    }
  };

  const cancelRide = async (rideId: string) => {
    if (!window.confirm("Cancel this ride? All bookings will be cancelled.")) return;
    try {
      await api.put(`/rides/${rideId}/cancel`);
      setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status: "Cancelled" } : r));
      toast.success("Ride cancelled");
    } catch {
      toast.error("Failed to cancel ride");
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await api.put(`/rides/${editingId}`, editData);
      toast.success("Ride updated");
      setEditingId(null);
      loadMyRides();
    } catch (err: any) {
      toast.error(err?.response?.data ?? "Update failed");
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const rideEarnings = (ride: Ride) =>
    ride.passengers.reduce((sum, p) => sum + (p.totalPrice || ride.price * p.seatsBooked), 0);

  // ── Loading / empty ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading your rides…</span>
        </div>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 text-gray-400">
        <div className="text-5xl">🚗</div>
        <h3 className="text-xl font-semibold text-gray-600">No rides yet</h3>
        <p className="text-sm">Create your first ride to get started</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Rides</h1>
          <p className="text-sm text-gray-500 mt-1">{rides.length} ride{rides.length !== 1 ? "s" : ""} total</p>
        </div>

        {/* Live tracking banner */}
        {trackingRideId && (
          <div className="mb-5 flex items-center gap-3 bg-green-600 text-white rounded-2xl px-4 py-3 shadow-md">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <div>
              <p className="font-bold text-sm">Live location sharing active</p>
              <p className="text-xs text-green-100">Passengers can see your location in real time</p>
            </div>
          </div>
        )}

        {/* Ride cards */}
        <div className="space-y-5">
          {rides.map((ride) => {
            const cfg        = STATUS_CONFIG[ride.status] ?? STATUS_CONFIG.Active;
            const isTracking = trackingRideId === ride.id;
            const earnings   = rideEarnings(ride);
            const isExpanded = expanded.has(ride.id);
            const pickups    = ride.passengers
              .map((p) => p.passengerAddress || p.pickupStop)
              .filter(Boolean) as string[];

            return (
              <div key={ride.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Status colour bar */}
                <div className={`h-1.5 w-full ${cfg.bar}`} />

                <div className="p-5">

                  {/* ── A. HEADER ─────────────────────────────────────────── */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        📅 {new Date(ride.departureTime).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <h3 className="font-bold text-gray-900 text-lg leading-snug">
                        {ride.fromAddress}
                        <span className="mx-2 text-gray-300 font-light">→</span>
                        {ride.toAddress}
                      </h3>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                      {isTracking ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
                      )}
                      {isTracking ? "Broadcasting" : cfg.label}
                    </span>
                  </div>

                  {/* ── B. QUICK STATS GRID ───────────────────────────────── */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Passengers</p>
                      <p className="text-xl font-bold text-gray-800">{ride.acceptedCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">Seats Left</p>
                      <p className="text-xl font-bold text-gray-800">
                        {ride.availableSeats}
                        <span className="text-xs text-gray-400 font-normal">/{ride.totalSeats}</span>
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl px-3 py-3 text-center border border-green-100">
                      <p className="text-xs text-green-600 mb-1">Earnings</p>
                      <p className="text-base font-bold text-green-700">
                        PKR {earnings > 0 ? earnings.toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  {/* ── C. PASSENGER SECTION (collapsible) ───────────────── */}
                  {ride.acceptedCount > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleExpanded(ride.id)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <span>👥 {ride.acceptedCount} Passenger{ride.acceptedCount !== 1 ? "s" : ""} on board</span>
                        <span className="text-blue-400">{isExpanded ? "▲ Hide" : "▼ Details"}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">

                          {/* Passenger list */}
                          {ride.passengers.map((p, i) => (
                            <div key={p.id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                {(p.fullName || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm">{p.fullName}</p>
                                <p className="text-xs text-gray-500">{p.phoneNumber}</p>
                                <div className="flex gap-3 mt-1.5 flex-wrap">
                                  <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                                    🪑 {p.seatsBooked} seat{p.seatsBooked !== 1 ? "s" : ""}
                                  </span>
                                  {(p.passengerAddress || p.pickupStop) && (
                                    <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600 truncate max-w-[180px]">
                                      📍 {p.passengerAddress || p.pickupStop}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs text-gray-400">Fare</p>
                                <p className="font-bold text-green-700 text-sm">
                                  PKR {Number(p.totalPrice || ride.price * p.seatsBooked).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* ── D. PICKUP FLOW TIMELINE ───────────────────── */}
                          {pickups.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Pickup Route
                              </p>
                              <div className="relative">
                                {/* vertical connector line */}
                                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-slate-300" />

                                {pickups.map((addr, i) => (
                                  <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0 mt-0.5 ring-2 ring-white z-10" />
                                    <p className="text-sm text-gray-700 leading-snug">{addr}</p>
                                  </div>
                                ))}

                                <div className="flex items-start gap-3">
                                  <div className="w-3.5 h-3.5 rounded-full bg-green-500 shrink-0 mt-0.5 ring-2 ring-white z-10" />
                                  <p className="text-sm font-semibold text-gray-800">{ride.toAddress} — Final Destination</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── E. STATUS BANNER ─────────────────────────────────── */}
                  {ride.status === "Active" && (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold mb-4 ${
                      ride.acceptedCount > 0
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-amber-50 border border-amber-200 text-amber-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ride.acceptedCount > 0 ? "bg-green-500" : "bg-amber-500"}`} />
                      {ride.acceptedCount > 0
                        ? `✅ ${ride.acceptedCount} passenger${ride.acceptedCount !== 1 ? "s" : ""} confirmed — ready to start`
                        : "⚠ No passengers yet — accept at least 1 to start"}
                    </div>
                  )}

                  {/* ── F. ACTION BUTTONS ─────────────────────────────────── */}
                  <div className="flex flex-col gap-2">

                    {ride.status === "Active" && (
                      <>
                        <button
                          onClick={() => ride.acceptedCount > 0 ? startRide(ride.id) : undefined}
                          disabled={ride.acceptedCount === 0}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                            ride.acceptedCount > 0
                              ? "bg-green-600 hover:bg-green-700 text-white active:scale-95 shadow-sm"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                          }`}
                        >
                          ▶ Start Ride
                          {ride.acceptedCount > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                              {ride.acceptedCount} passenger{ride.acceptedCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingId(ride.id); setEditData({ departureTime: ride.departureTime, availableSeats: ride.availableSeats }); }}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
                          >
                            ✏ Edit
                          </button>
                          <button
                            onClick={() => cancelRide(ride.id)}
                            className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all"
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </>
                    )}

                    {ride.status === "InProgress" && (
                      <button
                        onClick={() => completeRide(ride.id)}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
                      >
                        ✓ Complete Ride
                      </button>
                    )}

                    {ride.status === "Completed" && (
                      <div className="py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center text-sm text-gray-500 font-medium">
                        ✓ Ride completed · Earned PKR {earnings > 0 ? earnings.toLocaleString() : (ride.price * (ride.totalSeats - ride.availableSeats)).toLocaleString()}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Ride</h3>

            <label className="block text-sm font-semibold text-gray-700 mb-1">Departure Time</label>
            <input
              type="datetime-local"
              value={editData.departureTime}
              onChange={(e) => setEditData({ ...editData, departureTime: e.target.value })}
              className="w-full border border-gray-200 p-3 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <label className="block text-sm font-semibold text-gray-700 mb-1">Available Seats</label>
            <input
              type="number"
              min={1}
              value={editData.availableSeats}
              onChange={(e) => setEditData({ ...editData, availableSeats: Number(e.target.value) })}
              className="w-full border border-gray-200 p-3 rounded-xl mb-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
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
