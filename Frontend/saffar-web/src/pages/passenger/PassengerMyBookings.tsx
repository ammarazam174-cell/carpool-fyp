import { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import connection, { startSignalR } from "../../services/signalr";
import LiveTrackingMap from "../../components/LiveTrackingMap";

// ── Types ─────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  rideId: string;
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
  seatsBooked: number;
  totalPrice: number;
  pickupStop: string | null;
  dropoffStop: string | null;
  passengerAddress: string | null;
  passengerLatitude: number | null;
  passengerLongitude: number | null;
  createdAt: string;
  ride: {
    fromAddress: string;
    toAddress: string;
    departureTime: string;
    price: number;
    status: string;
    pickupLocation: string | null;
  };
  driver: { fullName: string; phoneNumber: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Pending:   { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400",  bar: "bg-amber-400"  },
  Accepted:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  bar: "bg-green-500"  },
  Rejected:  { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    bar: "bg-red-400"    },
  Cancelled: { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   bar: "bg-gray-300"   },
  Completed: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   bar: "bg-blue-400"   },
};

const FILTERS = ["All", "Pending", "Accepted", "Rejected", "Cancelled", "Completed"] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function PassengerMyBookings() {
  const [bookings, setBookings]             = useState<Booking[]>([]);
  const [loading, setLoading]               = useState(true);
  const [statusFilter, setStatusFilter]     = useState("All");
  const [cancelingId, setCancelingId]       = useState<string | null>(null);
  const [highlightedId, setHighlightedId]   = useState<string | null>(null);
  const previousBookings                    = useRef<Booking[]>([]);
  const statusFilterRef                     = useRef(statusFilter);

  // ── Load bookings ──────────────────────────────────────────────────────────

  const loadBookings = async (filter: string) => {
    try {
      const res = await api.get("/bookings/my");
      const all: Booking[] = res.data;
      const filtered = filter === "All" ? all : all.filter((b) => b.status === filter);

      filtered.forEach((nb) => {
        const ob = previousBookings.current.find((b) => b.id === nb.id);
        if (ob && ob.status !== nb.status) {
          if (nb.status === "Accepted") toast.success("🎉 Your booking was accepted!");
          if (nb.status === "Rejected") toast.error("❌ Your booking was rejected");
        }
      });
      previousBookings.current = JSON.parse(JSON.stringify(all));
      setBookings(filtered);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };


  // Keep ref in sync so SignalR handler always has current filter
  useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);

  // Initial load (+ reload when filter changes)
  useEffect(() => { loadBookings(statusFilter); }, [statusFilter]);

  // SignalR — real-time booking status updates
  useEffect(() => {
    startSignalR();

    const onBookingUpdated = (data: { bookingId: string; rideId: string; status: string }) => {
      const newStatus = data.status as Booking["status"];
      setBookings((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== data.bookingId) return b;
          if (b.status !== newStatus) {
            if (newStatus === "Accepted")  toast.success("🎉 Your booking was accepted!");
            if (newStatus === "Rejected")  toast.error("❌ Your booking was rejected");
            if (newStatus === "Cancelled") toast("Booking cancelled");
            if (newStatus === "Completed") toast.success("🎉 Ride completed!");
            setHighlightedId(data.bookingId);
            setTimeout(() => setHighlightedId(null), 3000);
          }
          return { ...b, status: newStatus };
        });
        const filter = statusFilterRef.current;
        return filter === "All" ? updated : updated.filter((b) => b.status === filter);
      });
    };

    connection.on("BookingUpdated", onBookingUpdated);
    return () => connection.off("BookingUpdated", onBookingUpdated);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const cancelBooking = async (bookingId: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      setCancelingId(bookingId);
      await api.put(`/bookings/${bookingId}/cancel`);
      toast.success("Booking cancelled");
      loadBookings(statusFilter);
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelingId(null);
    }
  };

  const openMap = (lat: number, lng: number, label = "") => {
    const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
    window.open(`https://www.google.com/maps?q=${q}&ll=${lat},${lng}`, "_blank");
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading your bookings…</span>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Track all your ride requests</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                statusFilter === f
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Empty */}
        {bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <div className="text-5xl">📭</div>
            <h3 className="text-xl font-semibold text-gray-600">No bookings found</h3>
            <p className="text-sm">
              {statusFilter === "All" ? "Book a ride from the dashboard" : `No ${statusFilter.toLowerCase()} bookings`}
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.Pending;
            const isLive = b.status === "Accepted" && b.ride.status === "InProgress";
            const pickup = b.passengerAddress || b.pickupStop;

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-500 ${
                  highlightedId === b.id ? "border-blue-400 ring-2 ring-blue-300" : "border-gray-100"
                }`}
              >

                {/* Coloured top bar */}
                <div className={`h-1 w-full ${isLive ? "bg-green-500 animate-pulse" : cfg.bar}`} />

                <div className="p-5">

                  {/* Route + badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        📅
                        {new Date(b.ride.departureTime).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {b.ride.fromAddress}
                        <span className="mx-2 text-gray-400 font-normal">→</span>
                        {b.ride.toAddress}
                      </h3>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                      {isLive ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      )}
                      {b.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 mb-4" />

                  {/* Driver info */}
                  {b.driver && b.status === "Accepted" && (
                    <div className="flex items-center justify-between gap-3 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                          {(b.driver.fullName ?? "D")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-medium mb-0.5">Your Driver</p>
                          <p className="font-semibold text-gray-800 text-sm">{b.driver.fullName}</p>
                          <p className="text-xs text-gray-500">{b.driver.phoneNumber}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${b.driver.phoneNumber}`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors"
                      >
                        📞 Call
                      </a>
                    </div>
                  )}

                  {/* ── LIVE TRACKING SECTION ── */}
                  {isLive && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                        <p className="font-bold text-green-700 text-sm">Live Tracking</p>
                        <span className="ml-auto text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full font-semibold">
                          On the way
                        </span>
                      </div>
                      <LiveTrackingMap rideId={b.rideId} />
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Seats Booked</p>
                      <p className="font-semibold text-gray-800 text-sm">🪑 {b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Price per Seat</p>
                      <p className="font-semibold text-gray-800 text-sm">💵 PKR {Number(b.ride.price).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-green-600 font-medium mb-0.5">Total Fare</p>
                      <p className="font-bold text-green-800 text-base">
                        PKR {Number(b.totalPrice || b.ride.price * b.seatsBooked).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Pickup location */}
                  {(pickup || b.ride.pickupLocation) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-blue-500 font-medium mb-0.5">
                            {pickup ? "Your Pickup Location" : "Driver Pickup Point"}
                          </p>
                          <p className="text-sm text-gray-800 font-medium">{pickup || b.ride.pickupLocation}</p>
                        </div>
                        {b.passengerLatitude && b.passengerLongitude && (
                          <button
                            onClick={() => openMap(b.passengerLatitude!, b.passengerLongitude!)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            🗺 Map
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Booked at */}
                  <p className="text-xs text-gray-400 mb-4">
                    Requested {new Date(b.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </p>

                  {/* Cancel button — Pending or Accepted (not InProgress) */}
                  {(b.status === "Pending" || (b.status === "Accepted" && b.ride.status !== "InProgress")) && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      disabled={cancelingId === b.id}
                      className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-all active:scale-95"
                    >
                      {cancelingId === b.id ? "Cancelling…" : "Cancel Booking ✕"}
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
