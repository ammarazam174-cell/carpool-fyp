import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import connection, { startSignalR } from "../../services/signalr";

type Booking = {
  id: string;
  rideId: string;
  status: "Pending" | "Accepted" | "Rejected" | "Cancelled" | "Completed";
  seatsBooked: number;
  rideAvailableSeats: number;
  rideTotalSeats: number;
  pricePerSeat: number;
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
  };
  passenger: {
    fullName: string;
    phoneNumber: string;
  } | null;
};

const STATUS_CONFIG = {
  Pending:   { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500",  label: "Pending"   },
  Accepted:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  label: "Accepted"  },
  Rejected:  { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    label: "Rejected"  },
  Cancelled: { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   label: "Cancelled" },
  Completed: { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "Completed" },
};

export default function DriverBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();

    startSignalR();

    // New passenger booking request — reload so full booking object appears
    const onNew = () => {
      toast("📬 New booking request!", { icon: "🔔" });
      loadBookings();
    };

    // Passenger cancelled their booking — update in place
    const onUpdated = (data: { bookingId: string; status: string }) => {
      if (data.status === "Cancelled") {
        setBookings((prev) =>
          prev.map((b) => b.id === data.bookingId ? { ...b, status: "Cancelled" } : b)
        );
        toast("Passenger cancelled their booking", { icon: "ℹ️" });
      }
    };

    // Real-time seat count update
    const onSeatsUpdated = (data: { rideId: string; availableSeats: number; totalSeats: number }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b.rideId === data.rideId
            ? { ...b, rideAvailableSeats: data.availableSeats, rideTotalSeats: data.totalSeats }
            : b
        )
      );
    };

    connection.on("NewBookingRequest",  onNew);
    connection.on("BookingUpdated",     onUpdated);
    connection.on("RideSeatsUpdated",   onSeatsUpdated);
    return () => {
      connection.off("NewBookingRequest",  onNew);
      connection.off("BookingUpdated",     onUpdated);
      connection.off("RideSeatsUpdated",   onSeatsUpdated);
    };
  }, []);

  const loadBookings = async () => {
    try {
      const res = await api.get("/bookings/driver/my");
      setBookings(res.data);
    } catch {
      toast.error("Failed to load booking requests");
    } finally {
      setLoading(false);
    }
  };

  const acceptBooking = async (id: string) => {
    try {
      setProcessingId(id);
      await api.put(`/bookings/${id}/accept`);
      toast.success("Booking accepted");
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "Accepted" } : b));
    } catch {
      toast.error("Failed to accept booking");
    } finally {
      setProcessingId(null);
    }
  };

  const rejectBooking = async (id: string) => {
    try {
      setProcessingId(id);
      await api.put(`/bookings/${id}/reject`);
      toast.success("Booking rejected");
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "Rejected" } : b));
    } catch {
      toast.error("Failed to reject booking");
    } finally {
      setProcessingId(null);
    }
  };

  const openMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading booking requests…</span>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-3">
        <div className="text-5xl">📭</div>
        <h3 className="text-xl font-semibold text-gray-600">No booking requests yet</h3>
        <p className="text-sm">Passengers will appear here once they request your rides</p>
      </div>
    );
  }

  const pending   = bookings.filter((b) => b.status === "Pending").length;
  const accepted  = bookings.filter((b) => b.status === "Accepted").length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pending > 0
              ? `${pending} pending request${pending > 1 ? "s" : ""} need your response`
              : `${accepted} accepted · ${bookings.length} total`}
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["Pending", "Accepted", "Rejected"] as const).map((s) => {
            const count = bookings.filter((b) => b.status === s).length;
            const cfg = STATUS_CONFIG[s];
            return (
              <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {s}: {count}
              </span>
            );
          })}
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.Pending;
            const isProcessing = processingId === b.id;
            const pickup = b.passengerAddress || b.pickupStop;

            return (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Status bar */}
                <div className={`h-1 w-full ${cfg.dot}`} />

                <div className="p-5">

                  {/* Top row: route + status badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span className="text-gray-400">📅</span>
                        {new Date(b.ride.departureTime).toLocaleString("en-PK", {
                          timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short",
                        })}
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {b.ride.fromAddress}
                        <span className="mx-2 text-gray-400 font-normal">→</span>
                        {b.ride.toAddress}
                      </h3>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 mb-4" />

                  {/* Passenger info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                      {(b.passenger?.fullName ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {b.passenger?.fullName || "Unknown Passenger"}
                      </p>
                      <p className="text-xs text-gray-500">{b.passenger?.phoneNumber || "—"}</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">

                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Seats Requested</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        🪑 {b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Price / Seat</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        💵 PKR {Number(b.pricePerSeat || b.ride.price || 0).toLocaleString()}
                      </p>
                    </div>

                    {(() => {
                      const perSeat = b.pricePerSeat || b.ride.price || 0;
                      const total   = b.totalPrice   || perSeat * b.seatsBooked;
                      return (
                        <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-green-600 font-medium mb-0.5">Total Fare</p>
                            <p className="text-xs text-gray-400">
                              PKR {Number(perSeat).toLocaleString()} × {b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <p className="text-xl font-bold text-green-700">
                            PKR {Number(total).toLocaleString()}
                          </p>
                        </div>
                      );
                    })()}

                    <div className={`col-span-2 rounded-xl px-3 py-2.5 ${b.rideAvailableSeats === 0 ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-100"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className={`text-xs font-medium ${b.rideAvailableSeats === 0 ? "text-red-500" : "text-blue-500"}`}>
                          Ride Seats
                        </p>
                        <span className={`text-xs font-bold ${b.rideAvailableSeats === 0 ? "text-red-600" : "text-blue-700"}`}>
                          {b.rideAvailableSeats === 0 ? "FULL 🔴" : `${b.rideAvailableSeats} left`}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: b.rideTotalSeats || 1 }, (_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 rounded-full ${i < (b.rideTotalSeats - b.rideAvailableSeats) ? "bg-blue-500" : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {b.rideTotalSeats - b.rideAvailableSeats}/{b.rideTotalSeats} seats reserved
                      </p>
                    </div>
                  </div>

                  {/* Pickup location */}
                  {pickup && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-blue-500 font-medium mb-0.5">Passenger Pickup</p>
                          <p className="text-sm text-gray-800 font-medium truncate">{pickup}</p>
                        </div>
                        {b.passengerLatitude && b.passengerLongitude && (
                          <button
                            onClick={() => openMap(b.passengerLatitude!, b.passengerLongitude!)}
                            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            🗺 Map
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Drop-off */}
                  {b.dropoffStop && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 mb-4">
                      <p className="text-xs text-gray-400 mb-0.5">Drop-off Stop</p>
                      <p className="text-sm text-gray-700">{b.dropoffStop}</p>
                    </div>
                  )}

                  {/* Request time */}
                  <p className="text-xs text-gray-400 mb-4">
                    Requested {new Date(b.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}
                  </p>

                  {/* Action buttons */}
                  {b.status === "Pending" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => acceptBooking(b.id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold transition-all active:scale-95"
                      >
                        {isProcessing ? <Spinner /> : "✓"} Accept
                      </button>
                      <button
                        onClick={() => rejectBooking(b.id)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-all active:scale-95"
                      >
                        {isProcessing ? <Spinner /> : "✕"} Reject
                      </button>
                    </div>
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

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
