import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

const FIXED_FARE = 1200;

export default function CreateRide() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [cityError, setCityError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    vehicleId: "",
    fromAddress: "",
    toAddress: "",
    departureTime: "",
    availableSeats: 0,
  });

  const [pickupStops, setPickupStops] = useState<string[]>([]);
  const [dropoffStops, setDropoffStops] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "availableSeats" ? Number(value) : value,
    }));
  };

  // ── Validation + open preview ─────────────────────────────────────────────
  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vehicleId) { alert("Please select a vehicle."); return; }

    if (!form.fromAddress || !form.toAddress) {
      setCityError("Please select both From City and To City.");
      return;
    }
    if (form.fromAddress === form.toAddress) {
      setCityError("From City and To City cannot be the same.");
      return;
    }
    setCityError("");

    if (!form.departureTime) { alert("Please select departure date & time."); return; }
    if (form.availableSeats <= 0) { alert("Available seats must be at least 1."); return; }
    if (pickupStops.some((s) => !s.trim())) { alert("Pickup stop names cannot be empty."); return; }
    if (dropoffStops.some((s) => !s.trim())) { alert("Dropoff stop names cannot be empty."); return; }

    setShowPreview(true);
  };

  // ── Confirm + call API ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        // <input type="datetime-local"> already gives a naked ISO ("2026-04-30T14:00").
        // Send it as-is; the backend treats naked ISO as PKT, avoiding any
        // browser-timezone shift from `.toISOString()`.
        departureTime: form.departureTime,
        pickupStops,
        dropoffStops,
      };
      const res = await api.post("/rides", payload);
      alert(res.data.message);
      navigate("/driver/my-rides");
    } catch (error: any) {
      alert(error.response?.data ?? "Failed to create ride.");
    } finally {
      setSubmitting(false);
    }
  };
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  // ── Preview screen ────────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-10">
        <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Review Your Ride</h2>
            <p className="text-blue-100 text-sm mt-0.5">Confirm details before publishing</p>
          </div>

          <div className="p-6 space-y-4">

            {/* Route */}
            <div className="flex items-center justify-between bg-gray-700 rounded-xl px-5 py-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">From</p>
                <p className="text-white font-bold text-lg">{form.fromAddress}</p>
              </div>
              <span className="text-2xl text-gray-400">→</span>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">To</p>
                <p className="text-white font-bold text-lg">{form.toAddress}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Departure" value={new Date(form.departureTime).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })} />
              <Detail label="Seats" value={`${form.availableSeats} seat${form.availableSeats !== 1 ? "s" : ""}`} />
              <Detail
                label="Vehicle"
                value={selectedVehicle ? `${selectedVehicle.model} — ${selectedVehicle.city}` : "—"}
              />
            </div>

            {/* Stops */}
            {pickupStops.length > 0 && (
              <StopList label="📍 Pickup Stops" stops={pickupStops} />
            )}
            {dropoffStops.length > 0 && (
              <StopList label="🏁 Dropoff Stops" stops={dropoffStops} />
            )}

            {/* Fare banner */}
            <div className="rounded-xl bg-green-900/40 border border-green-600/50 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
                  Fare (Fixed by Admin)
                </p>
                <p className="text-white text-2xl font-bold">PKR {FIXED_FARE.toLocaleString()}</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>

            <p className="text-center text-gray-500 text-xs">
              Fare is fixed by admin and cannot be changed.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-700 transition"
              >
                ← Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Publishing..." : "Confirm Ride ✓"}
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── Create Ride form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-lg">

        <h2 className="text-2xl font-bold text-center mb-6">Create Ride 🚗</h2>

        <form onSubmit={handlePreview} className="space-y-4">

          {/* Vehicle */}
          <div>
            <label className="block mb-1 font-medium">Select Vehicle</label>
            <select
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model} — {v.city}
                </option>
              ))}
            </select>
          </div>

          {/* From City */}
          <div>
            <label className="block mb-1 font-medium">From City</label>
            <select
              name="fromAddress"
              value={form.fromAddress}
              onChange={(e) => { handleChange(e); setCityError(""); }}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select From City</option>
              <option value="Karachi">Karachi</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* To City */}
          <div>
            <label className="block mb-1 font-medium">To City</label>
            <select
              name="toAddress"
              value={form.toAddress}
              onChange={(e) => { handleChange(e); setCityError(""); }}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select To City</option>
              <option value="Karachi" disabled={form.fromAddress === "Karachi"}>Karachi</option>
              <option value="Hyderabad" disabled={form.fromAddress === "Hyderabad"}>Hyderabad</option>
            </select>
          </div>

          {cityError && <p className="text-red-500 text-sm">⚠ {cityError}</p>}

          {/* Departure */}
          <div>
            <label className="block mb-1 font-medium">Departure Date & Time</label>
            <input
              type="datetime-local"
              name="departureTime"
              value={form.departureTime}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Seats */}
          <div>
            <label className="block mb-1 font-medium">Available Seats</label>
            <input
              type="number"
              name="availableSeats"
              min={1}
              placeholder="e.g. 3"
              value={form.availableSeats}
              onChange={handleChange}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fare info (read-only) */}
          <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-4 py-3">
            <div>
              <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Fixed Fare</p>
              <p className="text-green-800 font-bold text-lg">PKR {FIXED_FARE.toLocaleString()}</p>
            </div>
            <p className="text-xs text-green-600 text-right max-w-[160px]">
              Set by admin — not editable
            </p>
          </div>

          {/* Pickup Stops */}
          <div>
            <h4 className="font-semibold mb-1">Pickup Stops</h4>
            {pickupStops.map((s, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <input
                  value={s}
                  onChange={(e) => {
                    const x = [...pickupStops];
                    x[i] = e.target.value;
                    setPickupStops(x);
                  }}
                  placeholder={`Stop ${i + 1}`}
                  className="flex-1 border p-2 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setPickupStops(pickupStops.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 px-2 text-lg"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPickupStops([...pickupStops, ""])}
              className="text-blue-600 mt-2 text-sm hover:underline"
            >
              + Add Pickup Stop
            </button>
          </div>

          {/* Dropoff Stops */}
          <div>
            <h4 className="font-semibold mb-1">Dropoff Stops</h4>
            {dropoffStops.map((s, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <input
                  value={s}
                  onChange={(e) => {
                    const x = [...dropoffStops];
                    x[i] = e.target.value;
                    setDropoffStops(x);
                  }}
                  placeholder={`Stop ${i + 1}`}
                  className="flex-1 border p-2 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setDropoffStops(dropoffStops.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 px-2 text-lg"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDropoffStops([...dropoffStops, ""])}
              className="text-blue-600 mt-2 text-sm hover:underline"
            >
              + Add Dropoff Stop
            </button>
          </div>

          {/* Preview button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Preview Ride →
          </button>

        </form>
      </div>
    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-700 rounded-xl px-4 py-3">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </div>
  );
}

function StopList({ label, stops }: { label: string; stops: string[] }) {
  return (
    <div className="bg-gray-700 rounded-xl px-4 py-3">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {stops.map((s, i) => (
          <span
            key={i}
            className="bg-gray-600 text-white text-xs px-3 py-1 rounded-full"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
